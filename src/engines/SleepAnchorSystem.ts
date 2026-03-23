/**
 * Sleep Anchor System
 *
 * Purpose: Stabilize circadian rhythm to maintain executive function baseline
 * Neuroscience basis: Poor sleep dramatically reduces executive function capacity
 *
 * Research: Late/inconsistent sleep impairs ADHD symptoms significantly
 * Solution: Track sleep patterns and adapt workload accordingly
 */

import { SleepLog } from '../types/models';
import { differenceInMinutes, parse } from 'date-fns';

const MAX_ACCEPTABLE_DEVIATION_MINUTES = 60;

export interface SleepImpactAssessment {
  deviationMinutes: number;
  impactLevel: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE';
  workloadAdjustmentFactor: number; // Multiply max tasks by this
  recommendedMaxTasks: number;
  recommendedMaxDuration: number; // Minutes per task
  warnings: string[];
}

/**
 * Calculate sleep deviation from target
 */
export function calculateSleepDeviation(
  targetTime: string, // HH:mm
  actualTime: string // HH:mm
): number {
  const target = parse(targetTime, 'HH:mm', new Date());
  const actual = parse(actualTime, 'HH:mm', new Date());

  let diff = differenceInMinutes(actual, target);

  // Handle overnight times
  if (Math.abs(diff) > 12 * 60) {
    diff = diff > 0 ? diff - 24 * 60 : diff + 24 * 60;
  }

  return diff; // Positive = late, negative = early
}

/**
 * Assess sleep impact on executive function capacity
 */
export function assessSleepImpact(
  sleepLog: SleepLog,
  baseMaxTasks: number = 3,
  baseMaxDuration: number = 45
): SleepImpactAssessment {
  const warnings: string[] = [];
  let workloadAdjustmentFactor = 1.0;
  let impactLevel: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE' = 'NONE';

  // Calculate sleep time deviation
  const sleepDeviation = sleepLog.sleep_deviation_minutes || 0;
  const absSleepDeviation = Math.abs(sleepDeviation);

  // Assess deviation impact
  if (absSleepDeviation > 120) {
    // >2 hours deviation
    impactLevel = 'SEVERE';
    workloadAdjustmentFactor = 0.5;
    warnings.push('Severe sleep disruption - workload reduced by 50%');
  } else if (absSleepDeviation > 90) {
    // >1.5 hours deviation
    impactLevel = 'MODERATE';
    workloadAdjustmentFactor = 0.7;
    warnings.push('Moderate sleep disruption - workload reduced by 30%');
  } else if (absSleepDeviation > MAX_ACCEPTABLE_DEVIATION_MINUTES) {
    // >1 hour deviation
    impactLevel = 'LOW';
    workloadAdjustmentFactor = 0.85;
    warnings.push('Minor sleep disruption - workload reduced by 15%');
  }

  // Assess sleep quality impact
  if (sleepLog.sleep_quality_score && sleepLog.sleep_quality_score < 3) {
    workloadAdjustmentFactor *= 0.8;
    warnings.push('Poor sleep quality - additional 20% workload reduction');
    if (impactLevel === 'NONE') impactLevel = 'LOW';
  }

  // Calculate adjusted limits
  const recommendedMaxTasks = Math.max(
    Math.floor(baseMaxTasks * workloadAdjustmentFactor),
    1 // Always allow at least 1 task
  );

  const recommendedMaxDuration = Math.floor(
    baseMaxDuration * workloadAdjustmentFactor
  );

  return {
    deviationMinutes: sleepDeviation,
    impactLevel,
    workloadAdjustmentFactor,
    recommendedMaxTasks,
    recommendedMaxDuration,
    warnings,
  };
}

/**
 * Check if sleep pattern is concerning (requires intervention)
 */
export function isSleepPatternConcerning(recentSleepLogs: SleepLog[]): boolean {
  if (recentSleepLogs.length < 3) return false;

  // Check for consistent late sleep (>1 hour late for 3+ days)
  const consecutiveLateDays = recentSleepLogs
    .slice(0, 3)
    .every(log => (log.sleep_deviation_minutes || 0) > 60);

  if (consecutiveLateDays) return true;

  // Check for severe deviation (>2 hours) in last 7 days
  const severeDeviations = recentSleepLogs
    .slice(0, 7)
    .filter(log => Math.abs(log.sleep_deviation_minutes || 0) > 120);

  if (severeDeviations.length >= 2) return true;

  // Check for consistently poor sleep quality
  const poorQualityDays = recentSleepLogs
    .slice(0, 7)
    .filter(log => log.sleep_quality_score && log.sleep_quality_score < 3);

  if (poorQualityDays.length >= 4) return true;

  return false;
}

/**
 * Generate sleep recommendations based on pattern
 */
export function generateSleepRecommendations(
  recentSleepLogs: SleepLog[]
): string[] {
  const recommendations: string[] = [];

  if (recentSleepLogs.length === 0) {
    recommendations.push('Start tracking your sleep to optimize performance');
    return recommendations;
  }

  // Analyze last 7 days
  const last7Days = recentSleepLogs.slice(0, 7);

  // Check average deviation
  const avgDeviation =
    last7Days.reduce((sum, log) => sum + Math.abs(log.sleep_deviation_minutes || 0), 0) /
    last7Days.length;

  if (avgDeviation > 60) {
    recommendations.push('Try to maintain consistent sleep timing within 1 hour');
  }

  // Check for late sleep pattern
  const lateNights = last7Days.filter(log => (log.sleep_deviation_minutes || 0) > 30);
  if (lateNights.length >= 4) {
    recommendations.push('Consider moving sleep time 30 minutes earlier gradually');
  }

  // Check sleep quality
  const qualityLogs = last7Days.filter(log => log.sleep_quality_score !== undefined);
  if (qualityLogs.length > 0) {
    const avgQuality =
      qualityLogs.reduce((sum, log) => sum + (log.sleep_quality_score || 0), 0) /
      qualityLogs.length;

    if (avgQuality < 3) {
      recommendations.push('Sleep quality is affecting performance - consider sleep hygiene improvements');
    }
  }

  // Check for variability
  const deviations = last7Days.map(log => log.sleep_deviation_minutes || 0);
  const variance = calculateVariance(deviations);
  if (variance > 3600) { // High variability
    recommendations.push('Reduce sleep time variability for better cognitive stability');
  }

  return recommendations;
}

/**
 * Calculate variance helper
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Determine if long task sessions should be disabled
 */
export function shouldDisableLongSessions(sleepLog: SleepLog): boolean {
  const deviation = Math.abs(sleepLog.sleep_deviation_minutes || 0);
  const quality = sleepLog.sleep_quality_score || 5;

  // Disable if severe deviation OR poor quality
  return deviation > 120 || quality < 2;
}

/**
 * Calculate sleep consistency score (0-100)
 */
export function calculateSleepConsistency(recentSleepLogs: SleepLog[]): number {
  if (recentSleepLogs.length < 3) return 50; // Not enough data

  const last7Days = recentSleepLogs.slice(0, 7);

  // Calculate average absolute deviation
  const avgDeviation =
    last7Days.reduce((sum, log) => sum + Math.abs(log.sleep_deviation_minutes || 0), 0) /
    last7Days.length;

  // Convert to 0-100 score (lower deviation = higher score)
  // 0 minutes deviation = 100 score
  // 120+ minutes deviation = 0 score
  const score = Math.max(0, Math.min(100, 100 - (avgDeviation / 120) * 100));

  return Math.round(score);
}

/**
 * Create sleep log entry
 */
export function createSleepLogEntry(
  userId: string,
  date: string,
  targetSleepTime: string,
  actualSleepTime: string,
  targetWakeTime: string,
  actualWakeTime: string,
  sleepQualityScore?: number
): Omit<SleepLog, 'id' | 'created_at' | 'updated_at'> {
  const sleepDeviation = calculateSleepDeviation(targetSleepTime, actualSleepTime);

  return {
    user_id: userId,
    date,
    target_sleep_time: targetSleepTime,
    actual_sleep_time: actualSleepTime,
    target_wake_time: targetWakeTime,
    actual_wake_time: actualWakeTime,
    sleep_deviation_minutes: sleepDeviation,
    sleep_quality_score: sleepQualityScore,
  };
}
