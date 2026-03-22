/**
 * Forced Start Protocol (Task Initiation Engine)
 *
 * Purpose: Eliminate task initiation failure by removing decision points
 * Neuroscience basis: Executive dysfunction prevents action initiation
 *
 * Research: "Wanting to act but unable to start" is core ADHD symptom
 * Solution: Remove activation energy barrier through forced commitment
 */

import { Session, SessionStatus, Task, TaskStatus } from '../types/models';
import { addMinutes } from 'date-fns';

export const DEFAULT_COUNTDOWN_MINUTES = 5;

export interface ForcedStartState {
  session: Session;
  task: Task;
  countdownStartedAt: Date;
  countdownEndsAt: Date;
  isLocked: boolean;
}

/**
 * Initiate forced start protocol for a task
 * Locks user into countdown period
 */
export function initiateFor cedStart(
  task: Task,
  userId: string,
  countdownMinutes: number = DEFAULT_COUNTDOWN_MINUTES
): ForcedStartState {
  const now = new Date();
  const countdownEndsAt = addMinutes(now, countdownMinutes);

  const session: Session = {
    id: generateTempId(),
    user_id: userId,
    task_id: task.id,
    status: SessionStatus.INITIATED,
    start_initiated_at: now.toISOString(),
    start_actual_at: undefined,
    end_at: undefined,
    failure_reason: undefined,
    completion_percentage: undefined,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  return {
    session,
    task,
    countdownStartedAt: now,
    countdownEndsAt,
    isLocked: true,
  };
}

/**
 * User commits to starting task (before countdown expires)
 */
export function commitToStart(state: ForcedStartState): ForcedStartState {
  const now = new Date();

  return {
    ...state,
    session: {
      ...state.session,
      status: SessionStatus.ACTIVE,
      start_actual_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    task: {
      ...state.task,
      status: TaskStatus.IN_PROGRESS,
      updated_at: now.toISOString(),
    },
  };
}

/**
 * User explicitly fails the session
 * Requires double confirmation to prevent accidental failures
 */
export function failSession(
  state: ForcedStartState,
  reason: string
): ForcedStartState {
  const now = new Date();

  return {
    ...state,
    session: {
      ...state.session,
      status: SessionStatus.FAILED,
      end_at: now.toISOString(),
      failure_reason: reason,
      updated_at: now.toISOString(),
    },
    task: {
      ...state.task,
      status: TaskStatus.FAILED,
      updated_at: now.toISOString(),
    },
    isLocked: false,
  };
}

/**
 * Handle countdown expiration
 * Automatic failure if user hasn't committed
 */
export function handleCountdownExpired(
  state: ForcedStartState
): ForcedStartState {
  const now = new Date();

  // If already active, don't fail
  if (state.session.status === SessionStatus.ACTIVE) {
    return state;
  }

  return {
    ...state,
    session: {
      ...state.session,
      status: SessionStatus.FAILED,
      end_at: now.toISOString(),
      failure_reason: 'Countdown expired without commitment',
      updated_at: now.toISOString(),
    },
    task: {
      ...state.task,
      status: TaskStatus.FAILED,
      updated_at: now.toISOString(),
    },
    isLocked: false,
  };
}

/**
 * Handle app exit during forced start
 * Automatic failure - critical behavioral enforcement
 */
export function handleAppExit(state: ForcedStartState): ForcedStartState {
  const now = new Date();

  return {
    ...state,
    session: {
      ...state.session,
      status: SessionStatus.ABANDONED,
      end_at: now.toISOString(),
      failure_reason: 'App exited during forced start protocol',
      updated_at: now.toISOString(),
    },
    task: {
      ...state.task,
      status: TaskStatus.FAILED,
      updated_at: now.toISOString(),
    },
    isLocked: false,
  };
}

/**
 * Calculate start latency (time from initiation to actual start)
 * Used for feedback metrics
 */
export function calculateStartLatency(session: Session): number | null {
  if (!session.start_initiated_at || !session.start_actual_at) {
    return null;
  }

  const initiated = new Date(session.start_initiated_at);
  const actual = new Date(session.start_actual_at);
  return Math.floor((actual.getTime() - initiated.getTime()) / 1000 / 60); // Minutes
}

/**
 * Adaptive countdown adjustment based on failure patterns
 * Repeated failures → shorter countdown (less escape time)
 */
export function calculateAdaptiveCountdown(
  recentFailureCount: number,
  baseCountdownMinutes: number = DEFAULT_COUNTDOWN_MINUTES
): number {
  if (recentFailureCount === 0) return baseCountdownMinutes;
  if (recentFailureCount === 1) return Math.max(baseCountdownMinutes - 1, 3);
  if (recentFailureCount >= 2) return Math.max(baseCountdownMinutes - 2, 2);
  return 2; // Minimum 2 minutes
}

/**
 * Determine if task should be auto-fragmented after failure
 * Multiple failures suggest task is too large
 */
export function shouldAutoFragmentAfterFailure(
  task: Task,
  consecutiveFailures: number
): boolean {
  // If task already fragmented, don't fragment further
  if (task.is_fragmented) return false;

  // If failed 2+ times and duration > 30 minutes
  if (consecutiveFailures >= 2 && task.duration_minutes > 30) {
    return true;
  }

  return false;
}

/**
 * Generate temporary ID for client-side session creation
 */
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get remaining countdown time in seconds
 */
export function getRemainingCountdownSeconds(state: ForcedStartState): number {
  const now = new Date();
  const remaining = Math.floor(
    (state.countdownEndsAt.getTime() - now.getTime()) / 1000
  );
  return Math.max(remaining, 0);
}

/**
 * Check if countdown has expired
 */
export function isCountdownExpired(state: ForcedStartState): boolean {
  return getRemainingCountdownSeconds(state) === 0;
}
