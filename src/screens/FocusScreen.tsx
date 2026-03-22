/**
 * Focus Screen (Locked Mode)
 *
 * Full-screen focus mode with timer
 * User CANNOT switch tasks or leave without failing
 *
 * Neuroscience: External constraint compensates for attention drift
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, AppState, AppStateStatus } from 'react-native';
import { Button } from '../components/UI';
import { theme } from '../styles/theme';
import { Task, Session } from '../types/models';
import { differenceInSeconds, parseISO } from 'date-fns';

interface FocusScreenProps {
  task: Task;
  session: Session;
  onComplete: () => void;
  onFail: (reason: string) => void;
  onAbandon: () => void;
}

export function FocusScreen({ task, session, onComplete, onFail, onAbandon }: FocusScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showFailConfirm, setShowFailConfirm] = useState(false);

  const targetSeconds = task.duration_minutes * 60;
  const remainingSeconds = Math.max(targetSeconds - elapsedSeconds, 0);
  const progressPercent = Math.min((elapsedSeconds / targetSeconds) * 100, 100);

  // Track elapsed time
  useEffect(() => {
    if (!session.start_actual_at) return;

    const startTime = parseISO(session.start_actual_at);

    const updateElapsed = () => {
      const now = new Date();
      const elapsed = differenceInSeconds(now, startTime);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);

    return () => clearInterval(timer);
  }, [session.start_actual_at]);

  // Monitor app state - fail if backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        onAbandon();
      }
    });

    return () => subscription.remove();
  }, [onAbandon]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCompleteRequest = () => {
    setShowCompleteConfirm(true);
  };

  const handleConfirmComplete = () => {
    setShowCompleteConfirm(false);
    onComplete();
  };

  const handleFailRequest = () => {
    setShowFailConfirm(true);
  };

  const handleConfirmFail = () => {
    setShowFailConfirm(false);
    onFail('User failed during focus session');
  };

  return (
    <Modal visible={true} animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        {/* Task Title */}
        <Text style={styles.taskTitle}>{task.title}</Text>

        {/* Main Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>TIME REMAINING</Text>
          <Text style={styles.timer}>{formatTime(remainingSeconds)}</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.elapsedText}>
            Elapsed: {formatTime(elapsedSeconds)}
          </Text>
        </View>

        {/* Focus Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>Stay Focused</Text>
          <Text style={styles.messageText}>
            You're in locked focus mode.
            {'\n'}
            Complete this task without switching.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {elapsedSeconds >= targetSeconds * 0.8 && (
            <Button
              title="MARK COMPLETE"
              onPress={handleCompleteRequest}
              variant="primary"
              fullWidth
            />
          )}

          <Button
            title="I CANNOT CONTINUE"
            onPress={handleFailRequest}
            variant="danger"
            fullWidth
          />
        </View>

        <Text style={styles.warningText}>
          Leaving this screen = session abandoned
        </Text>

        {/* Complete Confirmation */}
        {showCompleteConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmDialog}>
              <Text style={styles.confirmTitle}>Task Complete?</Text>
              <Text style={styles.confirmMessage}>
                Have you completed this task?
                {'\n\n'}
                Time worked: {formatTime(elapsedSeconds)}
              </Text>
              <View style={styles.confirmActions}>
                <Button
                  title="NOT YET"
                  onPress={() => setShowCompleteConfirm(false)}
                  variant="secondary"
                  fullWidth
                />
                <Button
                  title="YES, COMPLETE"
                  onPress={handleConfirmComplete}
                  variant="primary"
                  fullWidth
                />
              </View>
            </View>
          </View>
        )}

        {/* Fail Confirmation */}
        {showFailConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmDialog}>
              <Text style={styles.confirmTitle}>End Session?</Text>
              <Text style={styles.confirmMessage}>
                This will mark the session as failed.
                {'\n\n'}
                Time worked: {formatTime(elapsedSeconds)}
              </Text>
              <View style={styles.confirmActions}>
                <Button
                  title="KEEP TRYING"
                  onPress={() => setShowFailConfirm(false)}
                  variant="secondary"
                  fullWidth
                />
                <Button
                  title="YES, END SESSION"
                  onPress={handleConfirmFail}
                  variant="danger"
                  fullWidth
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.surface,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  timerLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.surface,
    opacity: 0.8,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  timer: {
    fontSize: 96,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.surface,
    fontVariant: ['tabular-nums'],
    marginBottom: theme.spacing.lg,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
  },
  elapsedText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.surface,
    opacity: 0.6,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.surface,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  actions: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.surface,
    opacity: 0.7,
    textAlign: 'center',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDialog: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
  },
  confirmTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  confirmMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  confirmActions: {
    gap: theme.spacing.sm,
  },
});
