/**
 * Micro Reward Engine
 *
 * Purpose: Provide immediate, proportional positive reinforcement for task
 *   completion. Neuroscience basis: Dopamine release from immediate rewards
 *   strengthens the initiation → completion behaviour loop, which is
 *   chronically under-stimulated in executive dysfunction profiles.
 *
 * Design constraints:
 *  - Rewards must be immediate (< 2 seconds after completion)
 *  - Rewards must be proportional (streak bonuses, not flat praise)
 *  - No empty affirmations — messages reference the actual achievement
 */

import { RewardEvent } from '../types/models';

// ─── Reward Message Pools ─────────────────────────────────────────────────

const SINGLE_COMPLETION_MESSAGES = [
  'Task complete. Momentum is building.',
  'Done. One less thing between you and clarity.',
  'Completed. That counts.',
  'Finished. Your brain registered that as a win.',
  'Task closed. Executive function +1.',
];

const STREAK_MESSAGES: Record<number, string> = {
  2: '2 in a row. Pattern forming.',
  3: '3 consecutive completions — this is consistency.',
  4: '4 straight. Your initiation engine is running.',
  5: '5-task streak. Sustained executive control.',
};

const HIGH_STREAK_MESSAGE = (n: number) =>
  `${n}-task streak. This is what regulated execution looks like.`;

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Create a reward event for a completed task.
 * @param userId - The user's ID
 * @param taskId - The completed task's ID
 * @param taskTitle - Title of the completed task
 * @param currentStreak - Number of consecutive completions INCLUDING this one
 */
export function createRewardEvent(
  userId: string,
  taskId: string,
  taskTitle: string,
  currentStreak: number
): RewardEvent {
  return {
    id: `reward-${userId}-${Date.now()}`,
    userId,
    taskId,
    taskTitle,
    awardedAt: new Date().toISOString(),
    streakCount: currentStreak,
    message: buildRewardMessage(taskTitle, currentStreak),
  };
}

/**
 * Compute the updated consecutive completion streak.
 * Resets to 1 on any failure; increments on success.
 */
export function updateStreak(
  previousStreak: number,
  taskCompleted: boolean
): number {
  return taskCompleted ? previousStreak + 1 : 0;
}

/**
 * Return true if this streak count warrants a prominent celebration.
 */
export function isMilestoneStreak(streak: number): boolean {
  return streak >= 3 && (streak % 3 === 0 || streak === 5 || streak === 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildRewardMessage(taskTitle: string, streak: number): string {
  if (streak >= 6) return HIGH_STREAK_MESSAGE(streak);
  if (streak >= 2 && STREAK_MESSAGES[streak]) return STREAK_MESSAGES[streak];

  // Pick a message based on task title length for lightweight deterministic variation.
  const idx = taskTitle.length % SINGLE_COMPLETION_MESSAGES.length;
  return SINGLE_COMPLETION_MESSAGES[idx];
}
