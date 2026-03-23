/**
 * Time Skeleton Engine (Temporal Structure System)
 *
 * Purpose: Externalize time perception and provide rigid daily structure
 * Neuroscience basis: Time perception impairment in ADHD prevents reliable scheduling
 *
 * Research: Executive dysfunction impairs planning and time management
 * Solution: Pre-defined, non-negotiable time blocks
 */

import { DailyBlock, DailyBlockType } from '../types/models';
import { addMinutes, parse, format } from 'date-fns';

interface BlockDefinition {
  type: DailyBlockType;
  defaultStartTime: string; // HH:mm
  defaultDurationMinutes: number;
  allowedAdjustmentMinutes: number; // Max deviation from default
  description: string;
}

/**
 * Default time skeleton structure
 * User can only adjust within strict bounds
 */
const DEFAULT_TIME_SKELETON: BlockDefinition[] = [
  {
    type: DailyBlockType.WAKE,
    defaultStartTime: '07:00',
    defaultDurationMinutes: 60,
    allowedAdjustmentMinutes: 30,
    description: 'Morning routine and preparation',
  },
  {
    type: DailyBlockType.WORK_1,
    defaultStartTime: '08:00',
    defaultDurationMinutes: 180, // 3 hours
    allowedAdjustmentMinutes: 60,
    description: 'Primary work block - highest focus',
  },
  {
    type: DailyBlockType.BREAK,
    defaultStartTime: '11:00',
    defaultDurationMinutes: 60,
    allowedAdjustmentMinutes: 15,
    description: 'Mandatory break - no work tasks',
  },
  {
    type: DailyBlockType.WORK_2,
    defaultStartTime: '12:00',
    defaultDurationMinutes: 180, // 3 hours
    allowedAdjustmentMinutes: 60,
    description: 'Secondary work block',
  },
  {
    type: DailyBlockType.RECOVERY,
    defaultStartTime: '15:00',
    defaultDurationMinutes: 180, // 3 hours
    allowedAdjustmentMinutes: 30,
    description: 'Recovery period - light activities only',
  },
  {
    type: DailyBlockType.SLEEP,
    defaultStartTime: '23:00',
    defaultDurationMinutes: 480, // 8 hours
    allowedAdjustmentMinutes: 60,
    description: 'Sleep block',
  },
];

/**
 * Generate default daily blocks for a specific date
 */
export function generateDefaultDailyBlocks(
  userId: string,
  date: string, // ISO date string
  wakeTime?: string, // Optional custom wake time
  sleepTime?: string // Optional custom sleep time
): Omit<DailyBlock, 'id' | 'created_at' | 'updated_at'>[] {
  const blocks: Omit<DailyBlock, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Use custom times or defaults
  const actualWakeTime = wakeTime || DEFAULT_TIME_SKELETON[0].defaultStartTime;
  const actualSleepTime = sleepTime || DEFAULT_TIME_SKELETON[5].defaultStartTime;

  let currentStartTime = actualWakeTime;

  for (let i = 0; i < DEFAULT_TIME_SKELETON.length; i++) {
    const blockDef = DEFAULT_TIME_SKELETON[i];

    // Override start times for wake and sleep blocks
    if (blockDef.type === DailyBlockType.WAKE) {
      currentStartTime = actualWakeTime;
    } else if (blockDef.type === DailyBlockType.SLEEP) {
      currentStartTime = actualSleepTime;
    }

    const startTime = currentStartTime;
    const endTime = calculateEndTime(startTime, blockDef.defaultDurationMinutes);

    blocks.push({
      user_id: userId,
      date,
      block_type: blockDef.type,
      start_time: startTime,
      end_time: endTime,
    });

    // Calculate next block start time (except for sleep, which is fixed)
    if (blockDef.type !== DailyBlockType.SLEEP) {
      currentStartTime = endTime;
    }
  }

  return blocks;
}

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = addMinutes(start, durationMinutes);
  return format(end, 'HH:mm');
}

/**
 * Get current active block for a user
 */
export function getCurrentBlock(blocks: DailyBlock[]): DailyBlock | null {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  for (const block of blocks) {
    if (isTimeInBlock(currentTime, block.start_time, block.end_time)) {
      return block;
    }
  }

  return null;
}

/**
 * Check if a time falls within a block
 */
function isTimeInBlock(
  time: string,
  blockStart: string,
  blockEnd: string
): boolean {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(blockStart);
  let endMinutes = timeToMinutes(blockEnd);

  // Handle overnight blocks (e.g., sleep)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
    if (timeMinutes < startMinutes) {
      return timeMinutes + 24 * 60 >= startMinutes && timeMinutes + 24 * 60 < endMinutes;
    }
  }

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Convert HH:mm to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validate if a custom time adjustment is within allowed bounds
 */
export function validateTimeAdjustment(
  blockType: DailyBlockType,
  proposedTime: string
): { valid: boolean; reason?: string } {
  const blockDef = DEFAULT_TIME_SKELETON.find(b => b.type === blockType);
  if (!blockDef) {
    return { valid: false, reason: 'Invalid block type' };
  }

  const defaultMinutes = timeToMinutes(blockDef.defaultStartTime);
  const proposedMinutes = timeToMinutes(proposedTime);
  const difference = Math.abs(proposedMinutes - defaultMinutes);

  if (difference > blockDef.allowedAdjustmentMinutes) {
    return {
      valid: false,
      reason: `Time adjustment exceeds allowed range of ±${blockDef.allowedAdjustmentMinutes} minutes`,
    };
  }

  return { valid: true };
}

/**
 * Get next work block
 */
export function getNextWorkBlock(blocks: DailyBlock[]): DailyBlock | null {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  const workBlocks = blocks.filter(
    b => b.block_type === DailyBlockType.WORK_1 || b.block_type === DailyBlockType.WORK_2
  );

  for (const block of workBlocks) {
    if (timeToMinutes(block.start_time) > timeToMinutes(currentTime)) {
      return block;
    }
  }

  return null;
}

/**
 * Calculate total available work minutes for a day
 */
export function calculateTotalWorkMinutes(blocks: DailyBlock[]): number {
  return blocks
    .filter(
      b => b.block_type === DailyBlockType.WORK_1 || b.block_type === DailyBlockType.WORK_2
    )
    .reduce((total, block) => {
      const duration = timeToMinutes(block.end_time) - timeToMinutes(block.start_time);
      return total + duration;
    }, 0);
}

/**
 * Check if current time is within work hours
 */
export function isWorkTime(blocks: DailyBlock[]): boolean {
  const currentBlock = getCurrentBlock(blocks);
  if (!currentBlock) return false;

  return (
    currentBlock.block_type === DailyBlockType.WORK_1 ||
    currentBlock.block_type === DailyBlockType.WORK_2
  );
}

/**
 * Get block by type
 */
export function getBlockByType(
  blocks: DailyBlock[],
  type: DailyBlockType
): DailyBlock | undefined {
  return blocks.find(b => b.block_type === type);
}
