/**
 * Supabase Database Schema
 * PostgreSQL schema for production deployment
 */

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  target_wake_time TIME NOT NULL DEFAULT '07:00:00',
  target_sleep_time TIME NOT NULL DEFAULT '23:00:00',
  max_daily_tasks INTEGER NOT NULL DEFAULT 3,
  max_task_duration_minutes INTEGER NOT NULL DEFAULT 45,
  forced_start_countdown_minutes INTEGER NOT NULL DEFAULT 5,
  CONSTRAINT max_daily_tasks_check CHECK (max_daily_tasks > 0 AND max_daily_tasks <= 5),
  CONSTRAINT max_task_duration_check CHECK (max_task_duration_minutes > 0 AND max_task_duration_minutes <= 120)
);

CREATE INDEX users_email_idx ON users(email);

-- Daily blocks table
CREATE TABLE daily_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('WAKE', 'WORK_1', 'BREAK', 'WORK_2', 'RECOVERY', 'SLEEP')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT daily_blocks_unique_user_date_block UNIQUE (user_id, date, block_type),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE INDEX daily_blocks_user_date_idx ON daily_blocks(user_id, date);
CREATE INDEX daily_blocks_date_idx ON daily_blocks(date);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  urgency_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  is_fragmented BOOLEAN NOT NULL DEFAULT FALSE,
  fragment_order INTEGER,
  daily_block_id UUID REFERENCES daily_blocks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT urgency_range CHECK (urgency_score >= 0 AND urgency_score <= 100)
);

CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_deadline_idx ON tasks(deadline);
CREATE INDEX tasks_parent_task_idx ON tasks(parent_task_id);
CREATE INDEX tasks_user_status_idx ON tasks(user_id, status);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED')),
  start_initiated_at TIMESTAMPTZ,
  start_actual_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  failure_reason TEXT,
  completion_percentage INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT completion_percentage_range CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_task_id_idx ON sessions(task_id);
CREATE INDEX sessions_status_idx ON sessions(status);
CREATE INDEX sessions_created_at_idx ON sessions(created_at);

-- Sleep logs table
CREATE TABLE sleep_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  target_sleep_time TIME NOT NULL,
  actual_sleep_time TIME,
  target_wake_time TIME NOT NULL,
  actual_wake_time TIME,
  sleep_deviation_minutes INTEGER,
  sleep_quality_score INTEGER CHECK (sleep_quality_score >= 1 AND sleep_quality_score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sleep_logs_unique_user_date UNIQUE (user_id, date)
);

CREATE INDEX sleep_logs_user_date_idx ON sleep_logs(user_id, date);

-- Daily metrics table
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_tasks_planned INTEGER NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  total_tasks_failed INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  avg_start_latency_minutes NUMERIC(10, 2),
  completion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  workload_adjustment_factor NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT daily_metrics_unique_user_date UNIQUE (user_id, date),
  CONSTRAINT completion_rate_range CHECK (completion_rate >= 0 AND completion_rate <= 100),
  CONSTRAINT workload_adjustment_range CHECK (workload_adjustment_factor > 0 AND workload_adjustment_factor <= 1.5)
);

CREATE INDEX daily_metrics_user_date_idx ON daily_metrics(user_id, date);

-- Weekly patterns table
CREATE TABLE weekly_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  best_performing_block_type TEXT CHECK (best_performing_block_type IN ('WAKE', 'WORK_1', 'BREAK', 'WORK_2', 'RECOVERY', 'SLEEP')),
  worst_performing_block_type TEXT CHECK (worst_performing_block_type IN ('WAKE', 'WORK_1', 'BREAK', 'WORK_2', 'RECOVERY', 'SLEEP')),
  avg_completion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  failure_trend TEXT NOT NULL DEFAULT 'STABLE' CHECK (failure_trend IN ('IMPROVING', 'STABLE', 'DECLINING')),
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT weekly_patterns_unique_user_week UNIQUE (user_id, week_start_date)
);

CREATE INDEX weekly_patterns_user_idx ON weekly_patterns(user_id);
CREATE INDEX weekly_patterns_week_idx ON weekly_patterns(week_start_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_blocks_updated_at BEFORE UPDATE ON daily_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sleep_logs_updated_at BEFORE UPDATE ON sleep_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_metrics_updated_at BEFORE UPDATE ON daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_patterns ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY users_policy ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY daily_blocks_policy ON daily_blocks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY tasks_policy ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sessions_policy ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY sleep_logs_policy ON sleep_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY daily_metrics_policy ON daily_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY weekly_patterns_policy ON weekly_patterns FOR ALL USING (auth.uid() = user_id);
