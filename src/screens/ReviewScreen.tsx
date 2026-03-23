/**
 * Review Screen
 *
 * Daily summary and insights
 * No vanity metrics - only actionable feedback
 *
 * Design: Clear, factual, non-judgmental
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, SectionHeader, StatusBadge, Button, Divider } from '../components/UI';
import { theme } from '../styles/theme';
import { useStore, selectCompletedTasks, selectFailedTasks, selectActiveTasks } from '../store/appStore';
import { format } from 'date-fns';

interface ReviewScreenProps {
  onClose: () => void;
}

export function ReviewScreen({ onClose }: ReviewScreenProps) {
  const { todaysTasks, todaysMetrics } = useStore();

  const completedTasks = selectCompletedTasks(useStore.getState());
  const failedTasks = selectFailedTasks(useStore.getState());
  const activeTasks = selectActiveTasks(useStore.getState());

  const completionRate = todaysTasks.length > 0
    ? Math.round((completedTasks.length / todaysTasks.length) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionHeader
          title="Today's Review"
          subtitle={format(new Date(), 'EEEE, MMMM d')}
        />

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Summary</Text>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                {activeTasks.length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.error }]}>
                {failedTasks.length}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>

          <Divider />

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completion Rate</Text>
            <Text style={styles.metricValue}>{completionRate}%</Text>
          </View>

          {todaysMetrics?.avg_start_latency_minutes !== undefined && (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Avg Start Latency</Text>
              <Text style={styles.metricValue}>
                {Math.round(todaysMetrics.avg_start_latency_minutes)} min
              </Text>
            </View>
          )}
        </Card>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <Card style={styles.listCard}>
            <Text style={styles.cardTitle}>Completed Tasks</Text>
            {completedTasks.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View style={styles.taskItemHeader}>
                  <Text style={styles.taskItemTitle}>{task.title}</Text>
                  <StatusBadge status={task.status} small />
                </View>
                <Text style={styles.taskItemMeta}>
                  {task.duration_minutes} minutes
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Failed Tasks */}
        {failedTasks.length > 0 && (
          <Card style={styles.listCard}>
            <Text style={styles.cardTitle}>Failed Tasks</Text>
            {failedTasks.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View style={styles.taskItemHeader}>
                  <Text style={styles.taskItemTitle}>{task.title}</Text>
                  <StatusBadge status={task.status} small />
                </View>
                <Text style={styles.taskItemMeta}>
                  {task.duration_minutes} minutes
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Insights */}
        <Card style={styles.insightsCard}>
          <Text style={styles.cardTitle}>Insights</Text>

          {completionRate === 100 && todaysTasks.length > 0 && (
            <Text style={styles.insightText}>
              ✓ Perfect completion rate - excellent execution
            </Text>
          )}

          {completionRate >= 70 && completionRate < 100 && (
            <Text style={styles.insightText}>
              ✓ Good completion rate - strong performance
            </Text>
          )}

          {completionRate < 40 && todaysTasks.length > 0 && (
            <Text style={styles.insightText}>
              ⚠ Low completion rate - consider reducing task load tomorrow
            </Text>
          )}

          {failedTasks.length >= 2 && (
            <Text style={styles.insightText}>
              ⚠ Multiple failures detected - tasks may need fragmentation
            </Text>
          )}

          {activeTasks.length > 0 && (
            <Text style={styles.insightText}>
              → {activeTasks.length} task{activeTasks.length > 1 ? 's' : ''} still pending
            </Text>
          )}

          {todaysMetrics?.avg_start_latency_minutes !== undefined &&
            todaysMetrics.avg_start_latency_minutes < 2 && (
              <Text style={styles.insightText}>
                ✓ Fast task initiation - forced start protocol working well
              </Text>
            )}

          {todaysMetrics?.workload_adjustment_factor !== undefined &&
            todaysMetrics.workload_adjustment_factor < 1.0 && (
              <Text style={styles.insightText}>
                ℹ Workload was reduced today based on recent performance
              </Text>
            )}

          {todaysTasks.length === 0 && (
            <Text style={styles.insightText}>
              No tasks tracked today
            </Text>
          )}
        </Card>

        {/* System Adjustments */}
        {todaysMetrics?.workload_adjustment_factor !== undefined &&
          todaysMetrics.workload_adjustment_factor < 1.0 && (
            <Card style={styles.adjustmentCard}>
              <Text style={styles.cardTitle}>Tomorrow's Adjustments</Text>
              <Text style={styles.adjustmentText}>
                Based on today's performance, tomorrow's workload will be adjusted.
              </Text>
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Adjustment Factor</Text>
                <Text style={styles.adjustmentValue}>
                  {Math.round(todaysMetrics.workload_adjustment_factor * 100)}%
                </Text>
              </View>
            </Card>
          )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <Button title="CLOSE" onPress={onClose} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.layout.screenPadding,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.success,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  metricValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  listCard: {
    marginBottom: theme.spacing.lg,
  },
  taskItem: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  taskItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  taskItemTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.sm,
  },
  taskItemMeta: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  insightsCard: {
    marginBottom: theme.spacing.lg,
  },
  insightText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  adjustmentCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  adjustmentText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustmentLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  adjustmentValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
  },
  bottomActions: {
    padding: theme.layout.screenPadding,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
