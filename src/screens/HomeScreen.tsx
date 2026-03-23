/**
 * Home Screen
 *
 * Shows ONLY:
 * - Current time block
 * - Current task
 * - Start button
 *
 * Design principle: One decision per screen - reduce cognitive load
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useStore, selectActiveTasks } from '../store/appStore';
import { Button, Card, EmptyState, StatusBadge } from '../components/UI';
import { theme } from '../styles/theme';
import { DailyBlockType } from '../types/models';

interface HomeScreenProps {
  onStartTask: (taskId: string) => void;
  onStartWorkBlock: () => void;
  onAddTask: () => void;
  onViewReview: () => void;
}

export function HomeScreen({ onStartTask, onStartWorkBlock, onAddTask, onViewReview }: HomeScreenProps) {
  const {
    currentBlock,
    todaysTasks,
    currentUser,
    isInForcedStartMode,
    isInLockedFocusMode,
  } = useStore();

  const activeTasks = selectActiveTasks(useStore.getState());

  // Determine current block display
  const blockDisplay = currentBlock
    ? getBlockDisplayName(currentBlock.block_type)
    : 'No active block';

  const blockTime = currentBlock
    ? `${currentBlock.start_time} - ${currentBlock.end_time}`
    : '';

  const isWorkBlock =
    currentBlock?.block_type === DailyBlockType.WORK_1 ||
    currentBlock?.block_type === DailyBlockType.WORK_2;

  // Get next task (highest urgency)
  const nextTask = activeTasks.sort((a, b) => b.urgency_score - a.urgency_score)[0];

  const canAddMoreTasks = activeTasks.length < (currentUser?.settings.max_daily_tasks || 3);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Block Display */}
        <Card style={styles.blockCard}>
          <Text style={styles.blockLabel}>CURRENT BLOCK</Text>
          <Text style={styles.blockName}>{blockDisplay}</Text>
          {blockTime && <Text style={styles.blockTime}>{blockTime}</Text>}
        </Card>

        {/* Primary Action — always available */}
        {!isWorkBlock ? (
          /* Outside work block: offer to start one */
          <Card style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to work?</Text>
            <Text style={styles.ctaSubtitle}>
              Start a 3-hour work block to begin tackling your tasks.
            </Text>
            <View style={styles.actionSection}>
              <Button
                title="START WORK BLOCK"
                onPress={onStartWorkBlock}
                fullWidth
                disabled={isInForcedStartMode || isInLockedFocusMode}
              />
            </View>
          </Card>
        ) : nextTask ? (
          /* In work block with a task queued */
          <Card style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskLabel}>NEXT TASK</Text>
              <StatusBadge status={nextTask.status} small />
            </View>

            <Text style={styles.taskTitle}>{nextTask.title}</Text>

            <View style={styles.taskMeta}>
              <Text style={styles.taskMetaItem}>
                Duration: {nextTask.duration_minutes} min
              </Text>
              <Text style={styles.taskMetaItem}>
                Urgency: {nextTask.urgency_score}
              </Text>
            </View>

            {nextTask.description && (
              <Text style={styles.taskDescription}>{nextTask.description}</Text>
            )}

            {/* Start Button - Primary Action */}
            <View style={styles.actionSection}>
              <Button
                title="START TASK"
                onPress={() => onStartTask(nextTask.id)}
                fullWidth
                disabled={isInForcedStartMode || isInLockedFocusMode}
              />
            </View>
          </Card>
        ) : (
          /* In work block but no tasks yet */
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No active tasks"
              message={
                canAddMoreTasks
                  ? 'Add a task to begin your work block'
                  : 'Daily task limit reached'
              }
            />
            {canAddMoreTasks && (
              <Button
                title="ADD TASK"
                onPress={onAddTask}
                fullWidth
              />
            )}
          </Card>
        )}

        {/* Additional Tasks Summary */}
        {isWorkBlock && activeTasks.length > 1 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryText}>
              {activeTasks.length - 1} more task{activeTasks.length > 2 ? 's' : ''} pending
            </Text>
          </View>
        )}

        {/* Today's Summary */}
        {todaysTasks.length > 0 && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TODAY</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{todaysTasks.length}</Text>
                <Text style={styles.summaryItemLabel}>Total</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                  {todaysTasks.filter((t) => t.status === 'COMPLETED').length}
                </Text>
                <Text style={styles.summaryItemLabel}>Done</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                  {todaysTasks.filter((t) => t.status === 'FAILED').length}
                </Text>
                <Text style={styles.summaryItemLabel}>Failed</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Bottom Actions — always visible */}
      <View style={styles.bottomActions}>
        {canAddMoreTasks && (
          <Button
            title="CREATE TASK"
            onPress={onAddTask}
            variant="secondary"
            fullWidth
          />
        )}
        {todaysTasks.length > 0 && (
          <Button
            title="VIEW REVIEW"
            onPress={onViewReview}
            variant="secondary"
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

function getBlockDisplayName(blockType: DailyBlockType): string {
  switch (blockType) {
    case DailyBlockType.WAKE:
      return 'Morning Routine';
    case DailyBlockType.WORK_1:
      return 'Work Block 1';
    case DailyBlockType.BREAK:
      return 'Break Time';
    case DailyBlockType.WORK_2:
      return 'Work Block 2';
    case DailyBlockType.RECOVERY:
      return 'Recovery Period';
    case DailyBlockType.SLEEP:
      return 'Sleep Time';
    default:
      return blockType;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.layout.screenPadding,
  },
  blockCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  blockLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  blockName: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  blockTime: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  ctaCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  taskCard: {
    marginBottom: theme.spacing.lg,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  taskLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  taskTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  taskMetaItem: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  taskDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  actionSection: {
    marginTop: theme.spacing.lg,
  },
  emptyCard: {
    marginBottom: theme.spacing.lg,
  },
  summarySection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  summaryText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  summaryCard: {
    marginTop: theme.spacing.lg,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  summaryItemLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  bottomActions: {
    padding: theme.layout.screenPadding,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
