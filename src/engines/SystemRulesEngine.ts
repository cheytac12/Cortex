/**
 * System Rules Engine
 *
 * Purpose: Enforce strict behavioral constraints to prevent overwhelm
 * Neuroscience basis: Reduced optionality prevents decision paralysis
 *
 * Research: Too many choices impair executive function
 * Solution: Hard limits and automatic adjustments
 */

import { Task, DailyMetrics, SleepLog, User, TaskStatus } from '../types/models';
import { assessSleepImpact } from './SleepAnchorSystem';
import { parseISO, startOfDay, isToday } from 'date-fns';

export interface SystemConstraints {
  maxDailyTasks: number;
  maxTaskDurationMinutes: number;
  currentTaskCount: number;
  remainingTaskSlots: number;
  canAddTask: boolean;
  reasons: string[];
}

export interface WorkloadAdjustment {
  adjustmentFactor: number;
  adjustedMaxTasks: number;
  adjustedMaxDuration: number;
  reasons: string[];
}

const DEFAULT_MAX_TASKS = 3;
const DEFAULT_MAX_DURATION = 45;
const MIN_MAX_TASKS = 1;

/**
 * Calculate current system constraints for a user
 */
export function calculateSystemConstraints(
  user: User,
  todaysTasks: Task[],
  workloadAdjustment: WorkloadAdjustment
): SystemConstraints {
  const reasons: string[] = [];
  const currentTaskCount = todaysTasks.filter(
    t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.FAILED
  ).length;

  const maxDailyTasks = workloadAdjustment.adjustedMaxTasks;
  const remainingSlots = Math.max(maxDailyTasks - currentTaskCount, 0);
  const canAddTask = remainingSlots > 0;

  if (!canAddTask) {
    reasons.push(`Daily task limit reached (${maxDailyTasks} tasks)`);
  }

  if (workloadAdjustment.adjustmentFactor < 1.0) {
    reasons.push(`Workload reduced due to: ${workloadAdjustment.reasons.join(', ')}`);
  }

  return {
    maxDailyTasks,
    maxTaskDurationMinutes: workloadAdjustment.adjustedMaxDuration,
    currentTaskCount,
    remainingTaskSlots: remainingSlots,
    canAddTask,
    reasons,
  };
}

/**
 * Calculate workload adjustment based on recent performance and sleep
 */
export function calculateWorkloadAdjustment(
  user: User,
  recentMetrics: DailyMetrics[],
  todaySleepLog?: SleepLog
): WorkloadAdjustment {
  const reasons: string[] = [];
  let adjustmentFactor = 1.0;

  const baseMaxTasks = user.settings.max_daily_tasks || DEFAULT_MAX_TASKS;
  const baseMaxDuration = user.settings.max_task_duration_minutes || DEFAULT_MAX_DURATION;

  // 1. Sleep-based adjustment
  if (todaySleepLog) {
    const sleepImpact = assessSleepImpact(
      todaySleepLog,
      baseMaxTasks,
      baseMaxDuration
    );

    if (sleepImpact.workloadAdjustmentFactor < 1.0) {
      adjustmentFactor *= sleepImpact.workloadAdjustmentFactor;
      reasons.push(...sleepImpact.warnings);
    }
  }

  // 2. Performance-based adjustment (last 3 days)
  if (recentMetrics.length >= 2) {
    const last3Days = recentMetrics.slice(0, 3);
    const avgCompletionRate =
      last3Days.reduce((sum, m) => sum + m.completion_rate, 0) / last3Days.length;

    // Poor recent performance
    if (avgCompletionRate < 40) {
      adjustmentFactor *= 0.7;
      reasons.push('Recent low completion rate (<40%) - reducing workload');
    } else if (avgCompletionRate < 60) {
      adjustmentFactor *= 0.85;
      reasons.push('Recent moderate completion rate - slight workload reduction');
    }

    // High failure rate
    const avgFailureRate =
      last3Days.reduce(
        (sum, m) =>
          sum + (m.total_tasks_failed / Math.max(m.total_tasks_planned, 1)),
        0
      ) / last3Days.length;

    if (avgFailureRate > 0.5) {
      adjustmentFactor *= 0.75;
      reasons.push('High failure rate - enforcing stricter limits');
    }
  }

  // 3. Yesterday's performance (immediate feedback)
  if (recentMetrics.length > 0) {
    const yesterday = recentMetrics[0];

    // Complete failure yesterday
    if (yesterday.total_tasks_completed === 0 && yesterday.total_tasks_planned > 0) {
      adjustmentFactor *= 0.6;
      reasons.push('Zero completions yesterday - significant workload reduction');
    }

    // Apply yesterday's adjustment factor if exists
    if (yesterday.workload_adjustment_factor < 1.0) {
      adjustmentFactor = Math.min(
        adjustmentFactor,
        yesterday.workload_adjustment_factor
      );
    }
  }

  // Calculate final values
  const adjustedMaxTasks = Math.max(
    Math.floor(baseMaxTasks * adjustmentFactor),
    MIN_MAX_TASKS
  );

  const adjustedMaxDuration = Math.floor(baseMaxDuration * adjustmentFactor);

  return {
    adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
    adjustedMaxTasks,
    adjustedMaxDuration,
    reasons,
  };
}

/**
 * Validate task against system rules
 */
export function validateTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'>,
  constraints: SystemConstraints
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if can add task
  if (!constraints.canAddTask) {
    errors.push(`Cannot add task: daily limit of ${constraints.maxDailyTasks} tasks reached`);
  }

  // Check duration
  if (task.duration_minutes > constraints.maxTaskDurationMinutes) {
    // This is actually allowed - task will be auto-fragmented
    // But we inform the user
    errors.push(
      `Task duration (${task.duration_minutes}min) exceeds limit (${constraints.maxTaskDurationMinutes}min) - will be auto-fragmented`
    );
  }

  // Check deadline is in future
  const now = new Date();
  const deadline = parseISO(task.deadline);
  if (deadline < now) {
    errors.push('Deadline must be in the future');
  }

  // Check title is not empty
  if (!task.title || task.title.trim().length === 0) {
    errors.push('Task title cannot be empty');
  }

  return {
    valid: errors.length === 0 || errors.every(e => e.includes('auto-fragmented')),
    errors,
  };
}

/**
 * Enforce same-day deadline preference
 */
export function shouldEnforceSameDayDeadline(
  taskDeadline: string,
  currentDate: Date
): boolean {
  const deadline = parseISO(taskDeadline);

  // If deadline is more than 2 days away, suggest same-day
  const daysDifference = Math.floor(
    (deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysDifference > 2;
}

/**
 * Apply automatic task reduction after repeated failures
 */
export function applyFailureAdaptation(
  currentMaxTasks: number,
  consecutiveFailureDays: number
): number {
  if (consecutiveFailureDays === 0) return currentMaxTasks;

  // Reduce by 1 task for every 2 consecutive failure days
  const reduction = Math.floor(consecutiveFailureDays / 2);
  return Math.max(currentMaxTasks - reduction, MIN_MAX_TASKS);
}

/**
 * Determine if task rescheduling is allowed
 */
export function canRescheduleTask(
  task: Task,
  recentRescheduleCount: number
): { allowed: boolean; reason?: string } {
  // No immediate rescheduling after failure
  if (task.status === TaskStatus.FAILED) {
    return {
      allowed: false,
      reason: 'Cannot reschedule immediately after failure - wait 1 hour',
    };
  }

  // Limit reschedules per task
  if (recentRescheduleCount >= 2) {
    return {
      allowed: false,
      reason: 'Task has been rescheduled too many times - complete or remove it',
    };
  }

  return { allowed: true };
}

/**
 * Calculate strictness level based on user patterns
 */
export function calculateStrictnessLevel(
  recentMetrics: DailyMetrics[]
): 'LENIENT' | 'MODERATE' | 'STRICT' {
  if (recentMetrics.length < 3) return 'MODERATE';

  const last7Days = recentMetrics.slice(0, 7);
  const avgCompletionRate =
    last7Days.reduce((sum, m) => sum + m.completion_rate, 0) / last7Days.length;

  const failureRate =
    last7Days.reduce(
      (sum, m) =>
        sum + (m.total_tasks_failed / Math.max(m.total_tasks_planned, 1)),
      0
    ) / last7Days.length;

  // High performance - can be lenient
  if (avgCompletionRate > 80 && failureRate < 0.2) {
    return 'LENIENT';
  }

  // Poor performance - must be strict
  if (avgCompletionRate < 40 || failureRate > 0.5) {
    return 'STRICT';
  }

  return 'MODERATE';
}

/**
 * Get system recommendations based on constraints
 */
export function getSystemRecommendations(
  constraints: SystemConstraints,
  workloadAdjustment: WorkloadAdjustment
): string[] {
  const recommendations: string[] = [];

  if (workloadAdjustment.adjustmentFactor < 0.7) {
    recommendations.push('System has significantly reduced your workload');
    recommendations.push('Focus on completing fewer, high-priority tasks');
  }

  if (constraints.remainingTaskSlots === 0) {
    recommendations.push('Daily task limit reached - focus on completing current tasks');
  } else if (constraints.remainingTaskSlots === 1) {
    recommendations.push('Only 1 task slot remaining - use it wisely');
  }

  if (workloadAdjustment.reasons.length > 0) {
    recommendations.push('Workload adjusted due to:');
    recommendations.push(...workloadAdjustment.reasons.map(r => `  • ${r}`));
  }

  return recommendations;
}
