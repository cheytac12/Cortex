/**
 * Artificial Deadline Engine (Urgency System)
 *
 * Purpose: Calculate and generate urgency scores for tasks
 * Neuroscience basis: ADHD brains operate on interest/urgency-based nervous system
 *
 * Research: Low stimulation environments prevent task initiation
 * Artificial urgency compensates for lack of internal motivation
 */

import { Task, UrgencyCalculation, DailyBlock, DailyBlockType } from '../types/models';
import { differenceInMinutes, isToday, isTomorrow, parseISO } from 'date-fns';

const URGENCY_THRESHOLD_CRITICAL = 80;
const URGENCY_THRESHOLD_HIGH = 60;
const URGENCY_THRESHOLD_MEDIUM = 40;

/**
 * Calculate time-based urgency factor
 * Returns 0-100 based on time until deadline
 */
function calculateTimeUrgency(deadline: string): number {
  const now = new Date();
  const deadlineDate = parseISO(deadline);
  const minutesUntilDeadline = differenceInMinutes(deadlineDate, now);

  // Already overdue
  if (minutesUntilDeadline < 0) {
    return 100;
  }

  // Same day - high urgency
  if (isToday(deadlineDate)) {
    // Escalate as day progresses
    if (minutesUntilDeadline < 60) return 100;
    if (minutesUntilDeadline < 180) return 90;
    if (minutesUntilDeadline < 360) return 75;
    return 60;
  }

  // Tomorrow - medium urgency
  if (isTomorrow(deadlineDate)) {
    return 50;
  }

  // 2-3 days away
  if (minutesUntilDeadline < 4320) { // 3 days
    return 35;
  }

  // 4-7 days away
  if (minutesUntilDeadline < 10080) { // 7 days
    return 20;
  }

  // More than a week
  return 10;
}

/**
 * Calculate duration-based urgency factor
 * Longer tasks need earlier starts
 */
function calculateDurationUrgency(
  durationMinutes: number,
  deadline: string
): number {
  const now = new Date();
  const deadlineDate = parseISO(deadline);
  const minutesUntilDeadline = differenceInMinutes(deadlineDate, now);

  if (minutesUntilDeadline < 0) return 100;

  // If task duration is more than 50% of time until deadline
  const ratio = durationMinutes / minutesUntilDeadline;

  if (ratio > 0.8) return 90; // Very urgent - barely enough time
  if (ratio > 0.5) return 70; // Urgent - should start soon
  if (ratio > 0.3) return 50; // Moderate
  if (ratio > 0.1) return 30; // Some urgency
  return 10; // Plenty of time
}

/**
 * Calculate block compatibility urgency
 * Higher urgency if current block is suitable for the task
 */
function calculateBlockCompatibility(
  currentBlock: DailyBlock | null
): number {
  if (!currentBlock) return 0;

  switch (currentBlock.block_type) {
    case DailyBlockType.WORK_1:
    case DailyBlockType.WORK_2:
      return 30; // High compatibility - work blocks
    case DailyBlockType.WAKE:
    case DailyBlockType.RECOVERY:
      return 15; // Medium compatibility
    case DailyBlockType.BREAK:
    case DailyBlockType.SLEEP:
      return 0; // Low compatibility
    default:
      return 0;
  }
}

/**
 * Calculate overall urgency score for a task
 */
export function calculateUrgency(
  task: Task,
  currentBlock: DailyBlock | null
): UrgencyCalculation {
  const timeUrgency = calculateTimeUrgency(task.deadline);
  const durationUrgency = calculateDurationUrgency(
    task.duration_minutes,
    task.deadline
  );
  const blockCompatibility = calculateBlockCompatibility(currentBlock);

  // Weighted combination
  const score = Math.min(
    Math.round(
      timeUrgency * 0.5 +
      durationUrgency * 0.35 +
      blockCompatibility * 0.15
    ),
    100
  );

  return {
    score,
    factors: {
      timeUntilDeadline: timeUrgency,
      taskDuration: durationUrgency,
      currentBlockCompatibility: blockCompatibility,
    },
  };
}

/**
 * Get urgency level label
 */
export function getUrgencyLevel(score: number): string {
  if (score >= URGENCY_THRESHOLD_CRITICAL) return 'CRITICAL';
  if (score >= URGENCY_THRESHOLD_HIGH) return 'HIGH';
  if (score >= URGENCY_THRESHOLD_MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine if task should escalate (increase urgency artificially)
 */
export function shouldEscalateTask(
  task: Task,
  daysSinceCreation: number,
  failureCount: number
): boolean {
  // Escalate if task has been pending for too long
  if (daysSinceCreation > 2 && task.urgency_score < 60) return true;

  // Escalate if task has failed multiple times
  if (failureCount >= 2) return true;

  // Escalate if deadline is within 24 hours
  const now = new Date();
  const deadline = parseISO(task.deadline);
  const hoursUntilDeadline = differenceInMinutes(deadline, now) / 60;
  if (hoursUntilDeadline < 24 && task.urgency_score < 80) return true;

  return false;
}

/**
 * Escalate task urgency
 */
export function escalateTaskUrgency(currentScore: number): number {
  // Increase by 20 points, max 100
  return Math.min(currentScore + 20, 100);
}

/**
 * Sort tasks by urgency (highest first)
 */
export function sortTasksByUrgency(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.urgency_score - a.urgency_score);
}

/**
 * Filter tasks suitable for current time block
 */
export function filterTasksForCurrentBlock(
  tasks: Task[],
  currentBlock: DailyBlock | null
): Task[] {
  if (!currentBlock) return tasks;

  // Only work blocks should show tasks
  const workBlocks = [DailyBlockType.WORK_1, DailyBlockType.WORK_2];
  if (!workBlocks.includes(currentBlock.block_type)) {
    return [];
  }

  return tasks;
}
