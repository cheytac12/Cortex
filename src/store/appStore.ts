/**
 * Global Application State
 * Using Zustand for lightweight state management
 */

import { create } from 'zustand';
import {
  User,
  Task,
  Session,
  DailyBlock,
  DailyMetrics,
  AppState,
} from '../types/models';
import { ForcedStartState } from '../engines/ForcedStartEngine';

interface CortexStore extends AppState {
  // State
  forcedStartState: ForcedStartState | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentBlock: (block: DailyBlock | null) => void;
  setCurrentTask: (task: Task | null) => void;
  setCurrentSession: (session: Session | null) => void;
  setTodaysTasks: (tasks: Task[]) => void;
  setTodaysMetrics: (metrics: DailyMetrics | null) => void;
  setForcedStartState: (state: ForcedStartState | null) => void;
  setIsInForcedStartMode: (isIn: boolean) => void;
  setIsInLockedFocusMode: (isIn: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed actions
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;

  reset: () => void;
}

const initialState = {
  currentUser: null,
  currentBlock: null,
  currentTask: null,
  currentSession: null,
  todaysTasks: [],
  todaysMetrics: null,
  forcedStartState: null,
  isInForcedStartMode: false,
  isInLockedFocusMode: false,
  isLoading: false,
  error: null,
};

export const useStore = create<CortexStore>((set) => ({
  ...initialState,

  setCurrentUser: (user) => set({ currentUser: user }),

  setCurrentBlock: (block) => set({ currentBlock: block }),

  setCurrentTask: (task) => set({ currentTask: task }),

  setCurrentSession: (session) => set({ currentSession: session }),

  setTodaysTasks: (tasks) => set({ todaysTasks: tasks }),

  setTodaysMetrics: (metrics) => set({ todaysMetrics: metrics }),

  setForcedStartState: (state) => set({ forcedStartState: state }),

  setIsInForcedStartMode: (isIn) => set({ isInForcedStartMode: isIn }),

  setIsInLockedFocusMode: (isIn) => set({ isInLockedFocusMode: isIn }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  addTask: (task) =>
    set((state) => ({ todaysTasks: [...state.todaysTasks, task] })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      todaysTasks: state.todaysTasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
      currentTask:
        state.currentTask?.id === taskId
          ? { ...state.currentTask, ...updates }
          : state.currentTask,
    })),

  removeTask: (taskId) =>
    set((state) => ({
      todaysTasks: state.todaysTasks.filter((t) => t.id !== taskId),
      currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
    })),

  reset: () => set(initialState),
}));

/**
 * Selectors for derived state
 */
export const selectActiveTasks = (state: CortexStore) =>
  state.todaysTasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');

export const selectCompletedTasks = (state: CortexStore) =>
  state.todaysTasks.filter((t) => t.status === 'COMPLETED');

export const selectFailedTasks = (state: CortexStore) =>
  state.todaysTasks.filter((t) => t.status === 'FAILED');

export const selectCanAddTask = (state: CortexStore) => {
  const maxTasks = state.currentUser?.settings.max_daily_tasks || 3;
  const activeTasks = selectActiveTasks(state);
  return activeTasks.length < maxTasks;
};

export const selectCompletionRate = (state: CortexStore) => {
  if (state.todaysTasks.length === 0) return 0;
  const completed = selectCompletedTasks(state).length;
  return Math.round((completed / state.todaysTasks.length) * 100);
};
