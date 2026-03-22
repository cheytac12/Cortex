/**
 * Forced Start Screen
 *
 * Full-screen takeover implementing forced start protocol
 * User MUST commit or explicitly fail - no other options
 *
 * Neuroscience: Removes decision paralysis, forces initiation
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Button } from '../components/UI';
import { theme } from '../styles/theme';
import { ForcedStartState, getRemainingCountdownSeconds } from '../engines/ForcedStartEngine';

interface ForcedStartScreenProps {
  state: ForcedStartState;
  onCommit: () => void;
  onFail: (reason: string) => void;
}

export function ForcedStartScreen({ state, onCommit, onFail }: ForcedStartScreenProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(
    getRemainingCountdownSeconds(state)
  );
  const [showFailConfirm, setShowFailConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getRemainingCountdownSeconds(state);
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [state]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const handleFailRequest = () => {
    setShowFailConfirm(true);
  };

  const handleConfirmFail = () => {
    setShowFailConfirm(false);
    onFail('User explicitly failed session');
  };

  const handleCancelFail = () => {
    setShowFailConfirm(false);
  };

  return (
    <Modal visible={true} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Task Title */}
          <Text style={styles.taskTitle}>{state.task.title}</Text>

          {/* Countdown Display */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>TIME TO START</Text>
            <Text style={styles.countdown}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={styles.countdownMessage}>
              {remainingSeconds > 60
                ? 'Prepare to begin'
                : 'Starting very soon...'}
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>What happens next:</Text>
            <Text style={styles.instructionItem}>
              • When ready, tap "I'M READY" to begin
            </Text>
            <Text style={styles.instructionItem}>
              • You'll enter locked focus mode
            </Text>
            <Text style={styles.instructionItem}>
              • Complete the task without switching
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="I'M READY - START NOW"
              onPress={onCommit}
              fullWidth
            />

            <Button
              title="I CANNOT DO THIS TASK"
              onPress={handleFailRequest}
              variant="danger"
              fullWidth
            />
          </View>

          <Text style={styles.warningText}>
            Exiting this screen = automatic failure
          </Text>
        </View>

        {/* Fail Confirmation Modal */}
        {showFailConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmDialog}>
              <Text style={styles.confirmTitle}>Confirm Failure</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you cannot do this task?
                {'\n\n'}
                Repeated failures will reduce tomorrow's workload.
              </Text>
              <View style={styles.confirmActions}>
                <Button
                  title="GO BACK"
                  onPress={handleCancelFail}
                  variant="secondary"
                  fullWidth
                />
                <Button
                  title="YES, FAIL SESSION"
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
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  countdownLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  countdown: {
    fontSize: 72,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
    fontVariant: ['tabular-nums'],
  },
  countdownMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  instructionsContainer: {
    width: '100%',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xxl,
  },
  instructionsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  instructionItem: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
  },
  actions: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDialog: {
    width: '80%',
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
