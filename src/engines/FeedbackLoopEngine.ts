/**
 * Feedback Loop Engine
 *
 * Purpose: Track behavioral metrics and provide adaptive feedback
 * Neuroscience basis: External monitoring compensates for impaired self-awareness
 *
 * Research: ADHD individuals often lack accurate self-monitoring
 * Solution: Systematic tracking and pattern detection
 */

import {
  DailyMetrics,
  WeeklyPattern,
  Session,
  Task,
  SessionStatus,
  TaskStatus,
  DailyBlockType,
} from '../types/models';
import { startOfWeek, format, parseISO, differenceInDays } from 'date-fns';

export interface DailySummary {
  date: string;
  tasksCompleted: number;
  tasksFailed: number;
  completionRate: number;
  avgStartLatency?: number;
  totalWorkMinutes: number;
  insights: string[];
}

export interface WeeklySummary {
  weekStart: string;
  avgCompletionRate: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  bestDay?: string;
  worstDay?: string;
  recommendations: string[];
}

/**
 * Calculate daily metrics from sessions
 */
export function calculateDailyMetrics(
  userId: string,
  date: string,
  tasks: Task[],
  sessions: Session[]
): Omit<DailyMetrics, 'id' | 'created_at' | 'updated_at'> {
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
  const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED);

  const completionRate =
    tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

  // Calculate average start latency
  const validSessions = sessions.filter(
    s => s.start_initiated_at && s.start_actual_at
  );

  let avgStartLatency: number | undefined;
  if (validSessions.length > 0) {
    const totalLatency = validSessions.reduce((sum, session) => {
      const initiated = parseISO(session.start_initiated_at!);
      const actual = parseISO(session.start_actual_at!);
      const latency = Math.floor((actual.getTime() - initiated.getTime()) / 1000 / 60);
      return sum + latency;
    }, 0);

    avgStartLatency = totalLatency / validSessions.length;
  }

  return {
    user_id: userId,
    date,
    total_tasks_planned: tasks.length,
    total_tasks_completed: completedTasks.length,
    total_tasks_failed: failedTasks.length,
    total_sessions: sessions.length,
    avg_start_latency_minutes: avgStartLatency,
    completion_rate: completionRate,
    workload_adjustment_factor: 1.0, // Will be updated by system rules
  };
}

/**
 * Generate daily summary with insights
 */
export function generateDailySummary(
  metrics: DailyMetrics,
  tasks: Task[],
  sessions: Session[]
): DailySummary {
  const insights: string[] = [];

  // Completion rate insights
  if (metrics.completion_rate === 100) {
    insights.push('Perfect completion rate - excellent execution');
  } else if (metrics.completion_rate >= 70) {
    insights.push('Good completion rate - strong performance');
  } else if (metrics.completion_rate >= 40) {
    insights.push('Moderate completion rate - room for improvement');
  } else if (metrics.completion_rate > 0) {
    insights.push('Low completion rate - consider reducing task load');
  } else {
    insights.push('No tasks completed - system may need adjustment');
  }

  // Start latency insights
  if (metrics.avg_start_latency_minutes !== undefined) {
    if (metrics.avg_start_latency_minutes < 2) {
      insights.push('Fast task initiation - forced start protocol working well');
    } else if (metrics.avg_start_latency_minutes > 4) {
      insights.push('Delayed task initiation - consider shorter countdown periods');
    }
  }

  // Failure pattern insights
  const failedSessions = sessions.filter(s => s.status === SessionStatus.FAILED);
  if (failedSessions.length >= 2) {
    insights.push('Multiple session failures detected - tasks may need fragmentation');
  }

  // Calculate total work minutes
  const completedSessions = sessions.filter(s => s.status === SessionStatus.COMPLETED);
  const totalWorkMinutes = completedSessions.reduce((sum, session) => {
    if (session.start_actual_at && session.end_at) {
      const start = parseISO(session.start_actual_at);
      const end = parseISO(session.end_at);
      return sum + Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    }
    return sum;
  }, 0);

  return {
    date: metrics.date,
    tasksCompleted: metrics.total_tasks_completed,
    tasksFailed: metrics.total_tasks_failed,
    completionRate: metrics.completion_rate,
    avgStartLatency: metrics.avg_start_latency_minutes,
    totalWorkMinutes,
    insights,
  };
}

/**
 * Calculate weekly pattern analysis
 */
export function calculateWeeklyPattern(
  userId: string,
  weekStartDate: Date,
  dailyMetrics: DailyMetrics[]
): Omit<WeeklyPattern, 'id' | 'created_at'> {
  if (dailyMetrics.length === 0) {
    return {
      user_id: userId,
      week_start_date: format(weekStartDate, 'yyyy-MM-dd'),
      avg_completion_rate: 0,
      failure_trend: 'STABLE',
      recommendations: ['Start tracking tasks to build meaningful patterns'],
    };
  }

  // Calculate average completion rate
  const avgCompletionRate =
    dailyMetrics.reduce((sum, m) => sum + m.completion_rate, 0) /
    dailyMetrics.length;

  // Determine trend
  const trend = calculateTrend(dailyMetrics);

  // Find best and worst performing days
  const sorted = [...dailyMetrics].sort(
    (a, b) => b.completion_rate - a.completion_rate
  );
  const bestDay = sorted[0]?.date;
  const worstDay = sorted[sorted.length - 1]?.date;

  // Generate recommendations
  const recommendations = generateWeeklyRecommendations(
    dailyMetrics,
    trend,
    avgCompletionRate
  );

  return {
    user_id: userId,
    week_start_date: format(weekStartDate, 'yyyy-MM-dd'),
    avg_completion_rate: Math.round(avgCompletionRate),
    failure_trend: trend,
    recommendations,
  };
}

/**
 * Calculate trend from daily metrics
 */
function calculateTrend(metrics: DailyMetrics[]): 'IMPROVING' | 'STABLE' | 'DECLINING' {
  if (metrics.length < 3) return 'STABLE';

  // Sort by date
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

  // Compare first half vs second half
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg =
    firstHalf.reduce((sum, m) => sum + m.completion_rate, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, m) => sum + m.completion_rate, 0) / secondHalf.length;

  const difference = secondAvg - firstAvg;

  if (difference > 10) return 'IMPROVING';
  if (difference < -10) return 'DECLINING';
  return 'STABLE';
}

/**
 * Generate weekly recommendations
 */
function generateWeeklyRecommendations(
  metrics: DailyMetrics[],
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING',
  avgCompletionRate: number
): string[] {
  const recommendations: string[] = [];

  // Trend-based recommendations
  if (trend === 'IMPROVING') {
    recommendations.push('Performance improving - maintain current approach');
  } else if (trend === 'DECLINING') {
    recommendations.push('Performance declining - consider reducing workload');
    recommendations.push('Review sleep patterns and task complexity');
  }

  // Completion rate recommendations
  if (avgCompletionRate < 40) {
    recommendations.push('Low completion rate - reduce daily task count');
    recommendations.push('Focus on task fragmentation and smaller goals');
  } else if (avgCompletionRate > 80) {
    recommendations.push('High completion rate - consider slight workload increase');
  }

  // Consistency recommendations
  const variance = calculateCompletionVariance(metrics);
  if (variance > 400) {
    recommendations.push('High day-to-day variability - focus on consistency');
  }

  // Start latency recommendations
  const avgLatency =
    metrics
      .filter(m => m.avg_start_latency_minutes !== undefined)
      .reduce((sum, m) => sum + (m.avg_start_latency_minutes || 0), 0) /
    metrics.filter(m => m.avg_start_latency_minutes !== undefined).length;

  if (avgLatency > 3) {
    recommendations.push('Slow task initiation - consider shorter forced start countdowns');
  }

  return recommendations;
}

/**
 * Calculate variance in completion rates
 */
function calculateCompletionVariance(metrics: DailyMetrics[]): number {
  if (metrics.length === 0) return 0;

  const mean =
    metrics.reduce((sum, m) => sum + m.completion_rate, 0) / metrics.length;
  const squaredDiffs = metrics.map(m =>
    Math.pow(m.completion_rate - mean, 2)
  );

  return squaredDiffs.reduce((sum, val) => sum + val, 0) / metrics.length;
}

/**
 * Detect failure patterns
 */
export function detectFailurePatterns(
  sessions: Session[],
  tasks: Task[]
): {
  repeatedTaskFailures: Task[];
  timeBasedPatterns: string[];
  suggestedInterventions: string[];
} {
  const repeatedTaskFailures: Task[] = [];
  const timeBasedPatterns: string[] = [];
  const suggestedInterventions: string[] = [];

  // Find tasks that failed multiple times
  const taskFailureCounts = new Map<string, number>();
  sessions
    .filter(s => s.status === SessionStatus.FAILED)
    .forEach(s => {
      const count = taskFailureCounts.get(s.task_id) || 0;
      taskFailureCounts.set(s.task_id, count + 1);
    });

  taskFailureCounts.forEach((count, taskId) => {
    if (count >= 2) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        repeatedTaskFailures.push(task);
        suggestedInterventions.push(
          `Task "${task.title}" failed ${count} times - consider fragmentation or removal`
        );
      }
    }
  });

  // Analyze time-based patterns
  const failedSessions = sessions.filter(s => s.status === SessionStatus.FAILED);
  if (failedSessions.length >= 3) {
    // Check if failures cluster at specific times
    const failureTimes = failedSessions
      .filter(s => s.created_at)
      .map(s => new Date(s.created_at).getHours());

    const morningFailures = failureTimes.filter(h => h >= 6 && h < 12).length;
    const afternoonFailures = failureTimes.filter(h => h >= 12 && h < 18).length;
    const eveningFailures = failureTimes.filter(h => h >= 18 && h < 24).length;

    if (morningFailures > afternoonFailures && morningFailures > eveningFailures) {
      timeBasedPatterns.push('Failures cluster in morning - consider later work blocks');
    } else if (afternoonFailures > morningFailures && afternoonFailures > eveningFailures) {
      timeBasedPatterns.push('Failures cluster in afternoon - check energy levels and breaks');
    } else if (eveningFailures > morningFailures && eveningFailures > afternoonFailures) {
      timeBasedPatterns.push('Failures cluster in evening - likely fatigue-related');
    }
  }

  return {
    repeatedTaskFailures,
    timeBasedPatterns,
    suggestedInterventions,
  };
}

/**
 * Calculate momentum score (recent performance indicator)
 */
export function calculateMomentumScore(recentMetrics: DailyMetrics[]): number {
  if (recentMetrics.length === 0) return 50;

  // Weight more recent days higher
  let weightedSum = 0;
  let totalWeight = 0;

  recentMetrics.forEach((metric, index) => {
    const weight = recentMetrics.length - index; // More recent = higher weight
    weightedSum += metric.completion_rate * weight;
    totalWeight += weight;
  });

  return Math.round(weightedSum / totalWeight);
}
