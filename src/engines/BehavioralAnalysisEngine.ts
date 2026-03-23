/**
 * Behavioral Analysis Engine
 *
 * Purpose: Collect and analyze session data to identify behavioral patterns
 * Neuroscience basis: External tracking compensates for impaired self-awareness
 *   common in executive dysfunction profiles.
 *
 * Detects:
 *  - Avoidance patterns (repeated task skipping)
 *  - Time-of-day inefficiency
 *  - Overload failure (too many tasks → failure spike)
 *  - Sleep–performance correlation
 */

import {
  SessionRecord,
  BehavioralMetrics,
  FailurePattern,
  FailurePatternType,
} from '../types/models';

// ─── Metric Computation ───────────────────────────────────────────────────

/**
 * Compute high-level behavioral metrics from a list of session records.
 */
export function computeBehavioralMetrics(
  userId: string,
  sessions: SessionRecord[]
): BehavioralMetrics {
  if (sessions.length === 0) {
    return emptyMetrics(userId);
  }

  const avgInitiationLatency = average(sessions.map(s => s.startDelay_minutes));

  // Trend: compare first half vs second half initiation latency
  const initiationLatencyTrend = computeLatencyTrend(sessions);

  // Completion rate
  const completionRate = percentage(
    sessions.filter(s => s.completed).length,
    sessions.length
  );

  // Failure by hour of day
  const failureByHour: Record<number, number> = {};
  sessions
    .filter(s => !s.completed)
    .forEach(s => {
      failureByHour[s.hourOfDay] = (failureByHour[s.hourOfDay] || 0) + 1;
    });

  // Optimal focus window: 2-hour slot with highest completion rate
  const optimalFocusWindow = computeOptimalFocusWindow(sessions);

  // Cognitive fatigue hour: first hour where completion rate drops below 50%
  const cognitiveFatigueHour = computeCognitiveFatigueHour(sessions);

  return {
    userId,
    computedAt: new Date().toISOString(),
    avgInitiationLatency_minutes: round2(avgInitiationLatency),
    initiationLatencyTrend,
    completionRate_percent: completionRate,
    failureByHour,
    optimalFocusWindow,
    cognitiveFatigueHour,
  };
}

// ─── Pattern Detection ────────────────────────────────────────────────────

/**
 * Detect all behavioral failure patterns from sessions and optional sleep data.
 */
export function detectPatterns(
  sessions: SessionRecord[],
  taskSessionCounts?: Map<string, number>
): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  patterns.push(...detectAvoidancePatterns(sessions, taskSessionCounts));
  patterns.push(...detectTimeOfDayInefficiency(sessions));
  patterns.push(...detectOverloadFailure(sessions));
  patterns.push(...detectSleepPerformanceCorrelation(sessions));

  return patterns;
}

/**
 * Avoidance: a task that has been skipped/failed ≥ 2 times without completion.
 */
function detectAvoidancePatterns(
  sessions: SessionRecord[],
  taskSessionCounts?: Map<string, number>
): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  // Group by taskId
  const byTask = groupBy(sessions, s => s.taskId);
  byTask.forEach((taskSessions, taskId) => {
    const failures = taskSessions.filter(s => !s.completed).length;
    const completions = taskSessions.filter(s => s.completed).length;

    if (failures >= 2 && completions === 0) {
      const title = taskSessions[0]?.taskTitle ?? taskId;
      patterns.push({
        type: FailurePatternType.AVOIDANCE,
        description: `"${title}" has been attempted ${failures} times without completion. This is a classic avoidance signature — the task may be too large, too aversive, or lacks urgency clarity.`,
        severity: failures >= 4 ? 'HIGH' : failures >= 3 ? 'MEDIUM' : 'LOW',
        supportingData: { taskId, taskTitle: title, failureCount: failures },
      });
    }
  });

  // Also flag tasks that appear very frequently in the session count map but never complete
  if (taskSessionCounts) {
    taskSessionCounts.forEach((count, taskId) => {
      if (count >= 3) {
        const alreadyFlagged = patterns.some(
          p => p.type === FailurePatternType.AVOIDANCE &&
            (p.supportingData as Record<string, unknown>).taskId === taskId
        );
        if (!alreadyFlagged) {
          patterns.push({
            type: FailurePatternType.AVOIDANCE,
            description: `A task has been rescheduled ${count} times — a strong avoidance indicator.`,
            severity: 'MEDIUM',
            supportingData: { taskId, rescheduledCount: count },
          });
        }
      }
    });
  }

  return patterns;
}

/**
 * Time-of-day inefficiency: failure rate in a specific 3-hour window > 60%.
 */
function detectTimeOfDayInefficiency(sessions: SessionRecord[]): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  // Bucket sessions into 3-hour windows: 0-2, 3-5, 6-8, ...
  const buckets: Record<string, SessionRecord[]> = {};
  sessions.forEach(s => {
    const bucket = Math.floor(s.hourOfDay / 3) * 3;
    const key = `${bucket}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(s);
  });

  Object.entries(buckets).forEach(([startStr, bSessions]) => {
    if (bSessions.length < 2) return; // not enough data
    const failRate = percentage(
      bSessions.filter(s => !s.completed).length,
      bSessions.length
    );
    if (failRate >= 60) {
      const startHour = Number(startStr);
      const endHour = startHour + 3;
      const label = `${formatHour(startHour)}–${formatHour(endHour)}`;
      patterns.push({
        type: FailurePatternType.TIME_OF_DAY_INEFFICIENCY,
        description: `${failRate}% of tasks attempted between ${label} fail. Your executive control is demonstrably reduced during this window — likely due to circadian trough or post-meal fatigue.`,
        severity: failRate >= 80 ? 'HIGH' : 'MEDIUM',
        supportingData: { startHour, endHour, failureRate: failRate, sampleSize: bSessions.length },
      });
    }
  });

  return patterns;
}

/**
 * Overload failure: days with ≥ 4 tasks show failure rate > 50%.
 */
function detectOverloadFailure(sessions: SessionRecord[]): FailurePattern[] {
  // Group by date
  const byDate = groupBy(sessions, s => s.date);
  const overloadDays: { date: string; taskCount: number; failRate: number }[] = [];

  byDate.forEach((daySessions, date) => {
    if (daySessions.length >= 4) {
      const failRate = percentage(
        daySessions.filter(s => !s.completed).length,
        daySessions.length
      );
      if (failRate > 50) {
        overloadDays.push({ date, taskCount: daySessions.length, failRate });
      }
    }
  });

  if (overloadDays.length === 0) return [];

  const avgTasks = average(overloadDays.map(d => d.taskCount));
  return [
    {
      type: FailurePatternType.OVERLOAD_FAILURE,
      description: `On days with ≥4 tasks, your failure rate exceeds 50%. Cognitive overload suppresses executive initiation — each additional task beyond your threshold reduces completion probability for all tasks.`,
      severity: overloadDays.length >= 3 ? 'HIGH' : 'MEDIUM',
      supportingData: { affectedDays: overloadDays.length, avgTasksOnHighDays: round2(avgTasks) },
    },
  ];
}

/**
 * Sleep–performance correlation: low-sleep days have significantly lower completion.
 */
function detectSleepPerformanceCorrelation(sessions: SessionRecord[]): FailurePattern[] {
  const withSleep = sessions.filter(s => s.sleepQuality !== undefined);
  if (withSleep.length < 4) return []; // not enough data

  const poorSleep = withSleep.filter(s => (s.sleepQuality ?? 5) <= 2);
  const goodSleep = withSleep.filter(s => (s.sleepQuality ?? 0) >= 4);

  if (poorSleep.length === 0 || goodSleep.length === 0) return [];

  const poorCompletion = percentage(
    poorSleep.filter(s => s.completed).length,
    poorSleep.length
  );
  const goodCompletion = percentage(
    goodSleep.filter(s => s.completed).length,
    goodSleep.length
  );

  const gap = goodCompletion - poorCompletion;
  if (gap < 20) return []; // not a meaningful correlation

  return [
    {
      type: FailurePatternType.SLEEP_PERFORMANCE_CORRELATION,
      description: `Your task completion rate is ${goodCompletion}% on good-sleep days vs ${poorCompletion}% on poor-sleep days — a ${gap}-point gap. Sleep deprivation directly impairs prefrontal cortex function, which controls task initiation and sustained attention.`,
      severity: gap >= 40 ? 'HIGH' : 'MEDIUM',
      supportingData: { poorSleepCompletion: poorCompletion, goodSleepCompletion: goodCompletion, gap },
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function emptyMetrics(userId: string): BehavioralMetrics {
  return {
    userId,
    computedAt: new Date().toISOString(),
    avgInitiationLatency_minutes: 0,
    initiationLatencyTrend: 'STABLE',
    completionRate_percent: 0,
    failureByHour: {},
    optimalFocusWindow: null,
    cognitiveFatigueHour: null,
  };
}

function computeLatencyTrend(sessions: SessionRecord[]): 'IMPROVING' | 'STABLE' | 'WORSENING' {
  if (sessions.length < 4) return 'STABLE';
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(sorted.length / 2);
  const first = average(sorted.slice(0, mid).map(s => s.startDelay_minutes));
  const second = average(sorted.slice(mid).map(s => s.startDelay_minutes));
  const delta = second - first;
  if (delta < -0.5) return 'IMPROVING'; // latency decreasing = improvement
  if (delta > 0.5) return 'WORSENING';
  return 'STABLE';
}

function computeOptimalFocusWindow(
  sessions: SessionRecord[]
): { startHour: number; endHour: number } | null {
  if (sessions.length < 4) return null;

  let bestWindow = { startHour: 9, endHour: 11 };
  let bestRate = -1;

  for (let h = 6; h <= 20; h++) {
    const windowSessions = sessions.filter(s => s.hourOfDay >= h && s.hourOfDay < h + 2);
    if (windowSessions.length < 2) continue;
    const rate = percentage(
      windowSessions.filter(s => s.completed).length,
      windowSessions.length
    );
    if (rate > bestRate) {
      bestRate = rate;
      bestWindow = { startHour: h, endHour: h + 2 };
    }
  }

  return bestRate >= 0 ? bestWindow : null;
}

function computeCognitiveFatigueHour(sessions: SessionRecord[]): number | null {
  // Find the earliest hour where completion rate drops below 50%
  for (let h = 6; h <= 22; h++) {
    const hourSessions = sessions.filter(s => s.hourOfDay === h);
    if (hourSessions.length < 2) continue;
    const rate = percentage(
      hourSessions.filter(s => s.completed).length,
      hourSessions.length
    );
    if (rate < 50) return h;
  }
  return null;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatHour(h: number): string {
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  arr.forEach(item => {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  });
  return map;
}
