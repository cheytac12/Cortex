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

import { HomeScreen } from './screens/HomeScreen';
import { TaskEntryScreen } from './screens/TaskEntryScreen';
import { ForcedStartScreen } from './screens/ForcedStartScreen';
import { FocusScreen } from './screens/FocusScreen';
import { ReviewScreen } from './screens/ReviewScreen';

import { useStore } from './store/appStore';
import { theme } from './styles/theme';
import { supabase } from './lib/supabase';

import {
  initiateForcedStart,
  commitToStart,
  failSession,
  handleAppExit,
  handleCountdownExpired,
  isCountdownExpired,
} from './engines/ForcedStartEngine';

import {
  generateDefaultDailyBlocks,
  getCurrentBlock,
} from './engines/TimeSkeletonEngine';

import {
  calculateWorkloadAdjustment,
  calculateSystemConstraints,
} from './engines/SystemRulesEngine';

import { Task, TaskStatus, Session, SessionStatus, DailyBlock } from './types/models';
import { format, startOfDay } from 'date-fns';

const Stack = createNativeStackNavigator();

export default function App() {
  const {
    currentUser,
    setCurrentUser,
    currentBlock,
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
      if (todaysTasks.length > 0) {
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
      }
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
   * Handle focus session completion
   */
  const handleFocusComplete = () => {
    if (!currentTask || !currentSession) return;

    // Mark task and session as completed
    updateTask(currentTask.id, { status: TaskStatus.COMPLETED });
    setCurrentSession({
      ...currentSession,
      status: SessionStatus.COMPLETED,
      end_at: new Date().toISOString(),
      completion_percentage: 100,
    });

    setIsInLockedFocusMode(false);
    setCurrentTask(null);
    setCurrentSession(null);

    Alert.alert('Task Completed', 'Great work! Task marked as complete.');
  };

  /**
   * Handle focus session failure
   */
  const handleFocusFail = (reason: string) => {
    if (!currentTask || !currentSession) return;

    updateTask(currentTask.id, { status: TaskStatus.FAILED });
    setCurrentSession({
      ...currentSession,
      status: SessionStatus.FAILED,
      end_at: new Date().toISOString(),
      failure_reason: reason,
    });

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

    updateTask(currentTask.id, { status: TaskStatus.FAILED });
    setCurrentSession({
      ...currentSession,
      status: SessionStatus.ABANDONED,
      end_at: new Date().toISOString(),
      failure_reason: 'Session abandoned - app backgrounded',
    });

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
                onAddTask={() => props.navigation.navigate('TaskEntry')}
                onViewReview={() => props.navigation.navigate('Review')}
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
