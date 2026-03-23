/**
 * Core data models for Cortex behavioral regulation system
 * Based on neuroscience and executive function research
 */

export interface User {
  id: string;
  email: string;
  created_at: string;
  settings: UserSettings;
}

export interface UserSettings {
  target_wake_time: string; // HH:mm format
  target_sleep_time: string; // HH:mm format
  max_daily_tasks: number; // Default: 3
  max_task_duration_minutes: number; // Default: 45
  forced_start_countdown_minutes: number; // Default: 5
}

export enum DailyBlockType {
  WAKE = 'WAKE',
  WORK_1 = 'WORK_1',
  BREAK = 'BREAK',
  WORK_2 = 'WORK_2',
  RECOVERY = 'RECOVERY',
  SLEEP = 'SLEEP'
}

export interface DailyBlock {
  id: string;
  user_id: string;
  date: string; // ISO date string
  block_type: DailyBlockType;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  created_at: string;
  updated_at: string;
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  deadline: string; // ISO datetime string
  urgency_score: number; // 0-100
  status: TaskStatus;
  parent_task_id?: string; // For fragmented tasks
  is_fragmented: boolean;
  fragment_order?: number;
  daily_block_id?: string;
  created_at: string;
  updated_at: string;
}

export enum SessionStatus {
  INITIATED = 'INITIATED', // Start countdown begun
  ACTIVE = 'ACTIVE', // User in focus mode
  COMPLETED = 'COMPLETED', // Task completed
  FAILED = 'FAILED', // User failed or abandoned
  ABANDONED = 'ABANDONED' // App exit during session
}

export interface Session {
  id: string;
  user_id: string;
  task_id: string;
  status: SessionStatus;
  start_initiated_at?: string; // When forced start countdown began
  start_actual_at?: string; // When user actually started task
  end_at?: string; // When session ended
  failure_reason?: string;
  completion_percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string; // ISO date string
  target_sleep_time: string; // HH:mm format
  actual_sleep_time?: string; // HH:mm format
  target_wake_time: string; // HH:mm format
  actual_wake_time?: string; // HH:mm format
  sleep_deviation_minutes?: number; // Positive = late, negative = early
  sleep_quality_score?: number; // 1-5
  created_at: string;
  updated_at: string;
}

export interface DailyMetrics {
  id: string;
  user_id: string;
  date: string; // ISO date string
  total_tasks_planned: number;
  total_tasks_completed: number;
  total_tasks_failed: number;
  total_sessions: number;
  avg_start_latency_minutes?: number; // Time from initiation to actual start
  completion_rate: number; // 0-100
  workload_adjustment_factor: number; // 1.0 = normal, <1.0 = reduced
  created_at: string;
  updated_at: string;
}

export interface WeeklyPattern {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date string
  best_performing_block_type?: DailyBlockType;
  worst_performing_block_type?: DailyBlockType;
  avg_completion_rate: number;
  failure_trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  recommendations: string[];
  created_at: string;
}

/**
 * Client-side state models
 */

export interface AppState {
  currentUser: User | null;
  currentBlock: DailyBlock | null;
  currentTask: Task | null;
  currentSession: Session | null;
  todaysTasks: Task[];
  todaysMetrics: DailyMetrics | null;
  isInForcedStartMode: boolean;
  isInLockedFocusMode: boolean;
}

export interface TaskFragmentationResult {
  fragments: Omit<Task, 'id' | 'created_at' | 'updated_at'>[];
  reasoning: string;
}

export interface UrgencyCalculation {
  score: number; // 0-100
  factors: {
    timeUntilDeadline: number;
    taskDuration: number;
    currentBlockCompatibility: number;
  };
}

// ─── Behavioral Analysis Engine ───────────────────────────────────────────

export interface SessionRecord {
  sessionId: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  date: string; // yyyy-MM-dd
  hourOfDay: number; // 0–23
  startDelay_minutes: number; // time from initiation to actual start
  durationActual_minutes: number; // how long the session actually ran
  completed: boolean;
  interrupted: boolean;
  sleepQuality?: number; // 1-5 from sleep log
}

export interface BehavioralMetrics {
  userId: string;
  computedAt: string; // ISO datetime
  // Derived metrics
  avgInitiationLatency_minutes: number;
  initiationLatencyTrend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  completionRate_percent: number;
  // Failure clusters: hour-of-day → count
  failureByHour: Record<number, number>;
  optimalFocusWindow: { startHour: number; endHour: number } | null;
  // Simple cognitive fatigue: does completion rate drop after a certain hour?
  cognitiveFatigueHour: number | null;
}

export enum FailurePatternType {
  AVOIDANCE = 'AVOIDANCE',
  TIME_OF_DAY_INEFFICIENCY = 'TIME_OF_DAY_INEFFICIENCY',
  OVERLOAD_FAILURE = 'OVERLOAD_FAILURE',
  SLEEP_PERFORMANCE_CORRELATION = 'SLEEP_PERFORMANCE_CORRELATION',
}

export interface FailurePattern {
  type: FailurePatternType;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  supportingData: Record<string, unknown>;
}

// ─── AI Insight Engine ────────────────────────────────────────────────────

export enum InsightType {
  PERFORMANCE = 'PERFORMANCE',         // When user performs best
  FAILURE_DIAGNOSIS = 'FAILURE_DIAGNOSIS', // Why tasks failed
  BEHAVIORAL_RECOMMENDATION = 'BEHAVIORAL_RECOMMENDATION', // What to change
  ADAPTIVE_STRATEGY = 'ADAPTIVE_STRATEGY', // Concrete structural changes
}

export interface Insight {
  id: string;
  userId: string;
  type: InsightType;
  generatedAt: string; // ISO datetime
  period: 'DAILY' | 'WEEKLY';
  title: string;
  body: string; // Specific, medically-grounded explanation
  actionItems: string[]; // Concrete steps user can take
  relatedPattern?: FailurePatternType;
}

// ─── Micro Reward ─────────────────────────────────────────────────────────

export interface RewardEvent {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  awardedAt: string; // ISO datetime
  streakCount: number; // consecutive completions
  message: string;
}
