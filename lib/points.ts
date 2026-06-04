import { DayEntry, CustomTask } from './types';

export const TASK_POINTS = {
  workout1: 10,
  workout2: 10,
  diet: 10,
  water: 5,
  reading: 5,
  photo: 5,
} as const;

export const PERFECT_DAY_BONUS = 10;
export const CUSTOM_TASK_DAILY_CAP = 10;

export const WATER_GOAL_OZ = 128;
export const READING_GOAL_PAGES = 10;

// Every 5 pages beyond the 10-page goal = +5 pts, capped at +10. Requires task completed.
export function computeReadingBonus(pagesRead: number, completed: boolean): number {
  if (!completed) return 0;
  const extra = Math.max(0, pagesRead - READING_GOAL_PAGES);
  return Math.min(Math.floor(extra / 5) * 5, 10);
}

// Every 40 oz beyond the 128oz goal = +5 pts, capped at +10. Requires task completed.
export function computeWaterBonus(ozLogged: number, completed: boolean): number {
  if (!completed) return 0;
  const extra = Math.max(0, ozLogged - WATER_GOAL_OZ);
  return Math.min(Math.floor(extra / 40) * 5, 10);
}

export function computeDayPoints(entry: DayEntry, customTasks: CustomTask[]): number {
  let pts = 0;
  if (entry.workoutOneCompleted) pts += TASK_POINTS.workout1;
  if (entry.workoutTwoCompleted) pts += TASK_POINTS.workout2;
  if (entry.dietCompleted) pts += TASK_POINTS.diet;
  if (entry.waterCompleted) pts += TASK_POINTS.water;
  if (entry.readingCompleted) pts += TASK_POINTS.reading;
  if (entry.photoCompleted) pts += TASK_POINTS.photo;
  if (entry.allCoreCompleted) pts += PERFECT_DAY_BONUS;
  pts += computeReadingBonus(entry.pagesRead ?? 0, entry.readingCompleted);
  pts += computeWaterBonus(entry.waterOzLogged ?? 0, entry.waterCompleted);
  let customPts = 0;
  for (const taskId of (entry.customTasksCompleted ?? [])) {
    const task = customTasks.find((t) => t.id === taskId);
    if (task?.points) customPts += task.points;
  }
  pts += Math.min(customPts, CUSTOM_TASK_DAILY_CAP);
  return pts;
}
