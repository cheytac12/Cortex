/**
 * Main App Component
 *
 * Orchestrates the complete behavioral regulation system
 * Implements closed-loop: Task → Start → Focus → Feedback → Adaptation
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '@/screens/HomeScreen';
import { TaskEntryScreen } from '@/screens/TaskEntryScreen';
import { ForcedStartScreen } from '@/screens/ForcedStartScreen';
import { FocusScreen } from '@/screens/FocusScreen';
import { ReviewScreen } from '@/screens/ReviewScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';

import { useStore } from '@/store/appStore';
import { theme } from '@/styles/theme';
import { supabase } from '@/lib/supabase';

import {
  initiateForcedStart,
  commitToStart,
  failSession,
  handleCountdownExpired,
  isCountdownExpired,
} from '@/engines/ForcedStartEngine';

import {
  generateDefaultDailyBlocks,
  getCurrentBlock,
} from '@/engines/TimeSkeletonEngine';

import { createRewardEvent, updateStreak, isMilestoneStreak } from '@/engines/MicroRewardEngine';

import { Task, TaskStatus, SessionStatus, DailyBlock, DailyBlockType, SessionRecord } from '@/types/models';
import { format, startOfDay, addMinutes } from 'date-fns';

const Stack = createNativeStackNavigator();

export default function App() {
  const {
    currentUser,
    setCurrentUser,
    setCurrentBlock,
    currentTask,
    setCurrentTask,
    currentSession,
    setCurrentSession,
    todaysTasks,
    setTodaysTasks,
    forcedStartState,
    setForcedStartState,
    isInForcedStartMode,
    setIsInForcedStartMode,
    isInLockedFocusMode,
    setIsInLockedFocusMode,
    addTask,
    updateTask,
    addSessionRecord,
    completionStreak,
    setCompletionStreak,
  } = useStore();

  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize app - load user, blocks, tasks
   */
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Update current block every minute
   */
  useEffect(() => {
    if (!isInitialized) return;

    const updateCurrentBlock = () => {
        // Get blocks from somewhere (mock for now)
        const mockBlocks: DailyBlock[] = generateDefaultDailyBlocks(
          currentUser?.id || 'mock',
          format(new Date(), 'yyyy-MM-dd')
        ).map((block, idx) => ({
          ...block,
          id: `block-${idx}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const block = getCurrentBlock(mockBlocks);
        setCurrentBlock(block);
    };

    updateCurrentBlock();
    const interval = setInterval(updateCurrentBlock, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isInitialized, currentUser]);

  /**
   * Monitor forced start countdown
   */
  useEffect(() => {
    if (!forcedStartState) return;

    const checkCountdown = setInterval(() => {
      if (isCountdownExpired(forcedStartState)) {
        const expired = handleCountdownExpired(forcedStartState);
        setForcedStartState(expired);
        setIsInForcedStartMode(false);

        Alert.alert(
          'Countdown Expired',
          'The forced start countdown expired without commitment. Session marked as failed.'
        );
      }
    }, 1000);

    return () => clearInterval(checkCountdown);
  }, [forcedStartState]);

  const initializeApp = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Load user data
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setCurrentUser({
            id: userData.id,
            email: userData.email,
            created_at: userData.created_at,
            settings: {
              target_wake_time: userData.target_wake_time,
              target_sleep_time: userData.target_sleep_time,
              max_daily_tasks: userData.max_daily_tasks,
              max_task_duration_minutes: userData.max_task_duration_minutes,
              forced_start_countdown_minutes: userData.forced_start_countdown_minutes,
            },
          });

          // Load today's tasks
          await loadTodaysTasks(session.user.id);
        }
      } else {
        // Create mock user for demo
        const mockUser = {
          id: 'demo-user',
          email: 'demo@cortex.app',
          created_at: new Date().toISOString(),
          settings: {
            target_wake_time: '07:00',
            target_sleep_time: '23:00',
            max_daily_tasks: 3,
            max_task_duration_minutes: 45,
            forced_start_countdown_minutes: 5,
          },
        };
        setCurrentUser(mockUser);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize app');
    }
  };

  const loadTodaysTasks = async (userId: string) => {
    try {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today)
        .order('urgency_score', { ascending: false });

      if (tasks) {
        setTodaysTasks(tasks);
      }
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  };

  /**
   * Handle user manually starting a work block
   */
  const handleStartWorkBlock = () => {
    const now = new Date();
    const startTime = format(now, 'HH:mm');
    const endTime = format(addMinutes(now, 180), 'HH:mm'); // 3-hour block
    const workBlock: DailyBlock = {
      id: `manual-block-${Date.now()}-${Math.random()}`,
      user_id: currentUser?.id || 'demo-user',
      date: format(now, 'yyyy-MM-dd'),
      block_type: DailyBlockType.WORK_1,
      start_time: startTime,
      end_time: endTime,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    setCurrentBlock(workBlock);
  };

  /**
   * Handle task start - initiate forced start protocol
   */
  const handleStartTask = async (taskId: string) => {
    const task = todaysTasks.find((t) => t.id === taskId);
    if (!task || !currentUser) return;

    // Initiate forced start
    const state = initiateForcedStart(
      task,
      currentUser.id,
      currentUser.settings.forced_start_countdown_minutes
    );

    setForcedStartState(state);
    setCurrentTask(task);
    setIsInForcedStartMode(true);
  };

  /**
   * Handle user commits to starting task
   */
  const handleCommitToStart = () => {
    if (!forcedStartState) return;

    const committed = commitToStart(forcedStartState);
    setForcedStartState(committed);
    setCurrentSession(committed.session);
    setCurrentTask(committed.task);
    setIsInForcedStartMode(false);
    setIsInLockedFocusMode(true);

    // Update task status
    updateTask(committed.task.id, { status: TaskStatus.IN_PROGRESS });
  };

  /**
   * Handle forced start failure
   */
  const handleForcedStartFail = (reason: string) => {
    if (!forcedStartState) return;

    const failed = failSession(forcedStartState, reason);
    setForcedStartState(null);
    setIsInForcedStartMode(false);

    // Update task status
    updateTask(failed.task.id, { status: TaskStatus.FAILED });

    Alert.alert('Session Failed', 'This session has been marked as failed.');
  };

  /**
   * Build a SessionRecord for the behavioral analysis engine
   */
  const buildSessionRecord = (
    task: Task,
    session: { start_initiated_at?: string; start_actual_at?: string; end_at?: string },
    completed: boolean,
    sleepQuality?: number
  ): SessionRecord => {
    const now = new Date();
    const startInitiated = session.start_initiated_at ? new Date(session.start_initiated_at) : now;
    const startActual = session.start_actual_at ? new Date(session.start_actual_at) : now;
    const end = session.end_at ? new Date(session.end_at) : now;

    const startDelay = Math.max(0, Math.round((startActual.getTime() - startInitiated.getTime()) / 60000));
    const durationActual = Math.max(0, Math.round((end.getTime() - startActual.getTime()) / 60000));

    return {
      sessionId: `sr-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      userId: currentUser?.id ?? 'demo-user',
      date: format(now, 'yyyy-MM-dd'),
      hourOfDay: now.getHours(),
      startDelay_minutes: startDelay,
      durationActual_minutes: durationActual,
      completed,
      interrupted: false,
      sleepQuality,
    };
  };

  /**
   * Handle focus session completion
   */
  const handleFocusComplete = () => {
    if (!currentTask || !currentSession) return;

    const endTime = new Date().toISOString();
    const updatedSession = {
      ...currentSession,
      status: SessionStatus.COMPLETED,
      end_at: endTime,
      completion_percentage: 100,
    };

    // Mark task and session as completed
    updateTask(currentTask.id, { status: TaskStatus.COMPLETED });
    setCurrentSession(updatedSession);

    // Record session for behavioral analysis
    const record = buildSessionRecord(currentTask, updatedSession, true);
    addSessionRecord(record);

    // Micro-reward: update streak and show contextual message
    const newStreak = updateStreak(completionStreak, true);
    setCompletionStreak(newStreak);
    const reward = createRewardEvent(
      currentUser?.id ?? 'demo-user',
      currentTask.id,
      currentTask.title,
      newStreak
    );

    setIsInLockedFocusMode(false);
    setCurrentTask(null);
    setCurrentSession(null);

    const rewardSuffix = isMilestoneStreak(newStreak)
      ? `\n\n🎯 ${reward.message}`
      : `\n${reward.message}`;

    Alert.alert('Task Completed', `Great work!${rewardSuffix}`);
  };

  /**
   * Handle focus session failure
   */
  const handleFocusFail = (reason: string) => {
    if (!currentTask || !currentSession) return;

    const endTime = new Date().toISOString();
    const updatedSession = {
      ...currentSession,
      status: SessionStatus.FAILED,
      end_at: endTime,
      failure_reason: reason,
    };

    updateTask(currentTask.id, { status: TaskStatus.FAILED });
    setCurrentSession(updatedSession);

    // Record session for behavioral analysis
    const record = buildSessionRecord(currentTask, updatedSession, false);
    addSessionRecord(record);

    // Streak resets on failure
    setCompletionStreak(updateStreak(completionStreak, false));

    setIsInLockedFocusMode(false);
    setCurrentTask(null);
    setCurrentSession(null);

    Alert.alert('Session Failed', 'Session marked as failed.');
  };

  /**
   * Handle focus session abandoned (app exit)
   */
  const handleFocusAbandon = () => {
    if (!currentTask || !currentSession) return;

    const endTime = new Date().toISOString();
    const updatedSession = {
      ...currentSession,
      status: SessionStatus.ABANDONED,
      end_at: endTime,
      failure_reason: 'Session abandoned - app backgrounded',
    };

    updateTask(currentTask.id, { status: TaskStatus.FAILED });
    setCurrentSession(updatedSession);

    // Record session for behavioral analysis
    const record = buildSessionRecord(currentTask, updatedSession, false);
    addSessionRecord(record);

    // Streak resets on abandon
    setCompletionStreak(updateStreak(completionStreak, false));

    setIsInLockedFocusMode(false);
    setCurrentTask(null);
    setCurrentSession(null);
  };

  /**
   * Handle task creation
   */
  const handleTaskCreate = (tasks: Omit<Task, 'id' | 'created_at' | 'updated_at'>[]) => {
    // In real app, would save to Supabase
    // For now, add to local state
    tasks.forEach((task) => {
      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}-${Math.random()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addTask(newTask);
    });

    Alert.alert('Task Added', `${tasks.length} task(s) added successfully`);
  };

  if (!isInitialized) {
    return <View style={styles.loading} />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.textPrimary,
            headerTitleStyle: {
              fontWeight: theme.typography.fontWeight.semibold,
            },
          }}
        >
          <Stack.Screen
            name="Home"
            options={{ title: 'Cortex' }}
          >
            {(props) => (
              <HomeScreen
                {...props}
                onStartTask={handleStartTask}
                onStartWorkBlock={handleStartWorkBlock}
                onAddTask={() => props.navigation.navigate('TaskEntry')}
                onViewReview={() => props.navigation.navigate('Review')}
                onViewInsights={() => props.navigation.navigate('Insights')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="TaskEntry"
            options={{ title: 'Add Task' }}
          >
            {(props) => (
              <TaskEntryScreen
                {...props}
                onSubmit={(tasks) => {
                  handleTaskCreate(tasks);
                  props.navigation.goBack();
                }}
                onCancel={() => props.navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Review"
            options={{ title: 'Review' }}
          >
            {(props) => (
              <ReviewScreen
                {...props}
                onClose={() => props.navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Insights"
            options={{ title: 'Insights' }}
          >
            {(props) => (
              <InsightsScreen
                {...props}
                onClose={() => props.navigation.goBack()}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>

        {/* Forced Start Modal */}
        {isInForcedStartMode && forcedStartState && (
          <ForcedStartScreen
            state={forcedStartState}
            onCommit={handleCommitToStart}
            onFail={handleForcedStartFail}
          />
        )}

        {/* Focus Modal */}
        {isInLockedFocusMode && currentTask && currentSession && (
          <FocusScreen
            task={currentTask}
            session={currentSession}
            onComplete={handleFocusComplete}
            onFail={handleFocusFail}
            onAbandon={handleFocusAbandon}
          />
        )}
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
