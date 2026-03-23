/**
 * Task Fragmentation Engine
 *
 * Purpose: Automatically split large tasks into smaller, manageable fragments
 * Neuroscience basis: Reduces cognitive load and prevents task paralysis
 *
 * Research: Large tasks trigger avoidance due to cognitive overload
 */

import { Task, TaskFragmentationResult, TaskStatus } from '../types/models';

const MAX_TASK_DURATION_MINUTES = 45;
const MIN_FRAGMENT_DURATION_MINUTES = 15;

interface FragmentationStrategy {
  fragmentCount: number;
  durationPerFragment: number;
  reasoning: string;
}

/**
 * Calculate optimal fragmentation strategy
 */
function calculateFragmentationStrategy(
  durationMinutes: number,
  _taskTitle: string
): FragmentationStrategy {
  if (durationMinutes <= MAX_TASK_DURATION_MINUTES) {
    return {
      fragmentCount: 1,
      durationPerFragment: durationMinutes,
      reasoning: 'Task duration within acceptable range',
    };
  }

  // Calculate number of fragments needed
  const idealFragmentCount = Math.ceil(durationMinutes / MAX_TASK_DURATION_MINUTES);
  const durationPerFragment = Math.ceil(durationMinutes / idealFragmentCount);

  // Ensure fragments are not too small
  if (durationPerFragment < MIN_FRAGMENT_DURATION_MINUTES) {
    return {
      fragmentCount: Math.floor(durationMinutes / MIN_FRAGMENT_DURATION_MINUTES),
      durationPerFragment: MIN_FRAGMENT_DURATION_MINUTES,
      reasoning: 'Adjusted to prevent fragments that are too small',
    };
  }

  return {
    fragmentCount: idealFragmentCount,
    durationPerFragment,
    reasoning: `Task exceeds ${MAX_TASK_DURATION_MINUTES} minutes, split into ${idealFragmentCount} manageable parts`,
  };
}

/**
 * Generate descriptive titles for fragments
 */
function generateFragmentTitles(
  baseTitle: string,
  fragmentCount: number
): string[] {
  if (fragmentCount === 1) {
    return [baseTitle];
  }

  const titles: string[] = [];

  // Pattern-based fragment naming
  if (baseTitle.toLowerCase().includes('study') || baseTitle.toLowerCase().includes('read')) {
    for (let i = 0; i < fragmentCount; i++) {
      titles.push(`${baseTitle} - Part ${i + 1} of ${fragmentCount}`);
    }
  } else if (baseTitle.toLowerCase().includes('write') || baseTitle.toLowerCase().includes('draft')) {
    const phases = ['Outline', 'Draft', 'Review', 'Finalize'];
    for (let i = 0; i < fragmentCount; i++) {
      const phase = phases[Math.min(i, phases.length - 1)];
      titles.push(`${baseTitle} - ${phase}`);
    }
  } else {
    // Default: sequential numbering
    for (let i = 0; i < fragmentCount; i++) {
      titles.push(`${baseTitle} - Session ${i + 1}/${fragmentCount}`);
    }
  }

  return titles;
}

/**
 * Fragment a task into smaller sub-tasks
 */
export function fragmentTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'>
): TaskFragmentationResult {
  const strategy = calculateFragmentationStrategy(
    task.duration_minutes,
    task.title
  );

  if (strategy.fragmentCount === 1) {
    return {
      fragments: [task],
      reasoning: strategy.reasoning,
    };
  }

  const fragmentTitles = generateFragmentTitles(task.title, strategy.fragmentCount);
  const fragments: Omit<Task, 'id' | 'created_at' | 'updated_at'>[] = [];

  for (let i = 0; i < strategy.fragmentCount; i++) {
    fragments.push({
      user_id: task.user_id,
      title: fragmentTitles[i],
      description: task.description,
      duration_minutes: strategy.durationPerFragment,
      deadline: task.deadline,
      urgency_score: task.urgency_score,
      status: TaskStatus.PENDING,
      parent_task_id: undefined, // Will be set after parent is created
      is_fragmented: true,
      fragment_order: i,
      daily_block_id: task.daily_block_id,
    });
  }

  return {
    fragments,
    reasoning: strategy.reasoning,
  };
}

/**
 * Validate if a task needs fragmentation
 */
export function needsFragmentation(durationMinutes: number): boolean {
  return durationMinutes > MAX_TASK_DURATION_MINUTES;
}

/**
 * Estimate cognitive load based on task characteristics
 */
export function estimateCognitiveLoad(task: Task): number {
  let load = 0;

  // Duration-based load
  load += Math.min(task.duration_minutes / MAX_TASK_DURATION_MINUTES, 1) * 40;

  // Urgency-based load
  load += (task.urgency_score / 100) * 30;

  // Fragmentation reduces load
  if (task.is_fragmented) {
    load *= 0.7; // 30% reduction for fragmented tasks
  }

  return Math.min(Math.round(load), 100);
}
