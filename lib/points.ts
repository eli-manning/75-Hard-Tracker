import { format, subDays, parseISO } from 'date-fns';
import { DayEntry, CustomTask, UserProfile } from './types';

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

// Computes allCoreCompleted for a given entry and profile.
// For 75hard: all 6 tasks required (including outdoor workout 2).
// For general: only non-hidden tasks required; if all hidden, requires at least one custom task.
export function computeAllCoreCompleted(entry: DayEntry, profile: UserProfile): boolean {
  if (profile.challengeMode !== 'general') {
    return (
      entry.workoutOneCompleted &&
      entry.workoutTwoCompleted &&
      entry.workoutTwoOutdoor &&
      entry.dietCompleted &&
      entry.waterCompleted &&
      entry.readingCompleted &&
      entry.photoCompleted
    );
  }
  const hidden = profile.hiddenCoreTasks ?? {};
  const checks: boolean[] = [];
  if (!hidden.workout1) checks.push(entry.workoutOneCompleted);
  if (!hidden.workout2) checks.push(entry.workoutTwoCompleted);
  if (!hidden.diet)    checks.push(entry.dietCompleted);
  if (!hidden.water)   checks.push(entry.waterCompleted);
  if (!hidden.reading) checks.push(entry.readingCompleted);
  if (!hidden.photo)   checks.push(entry.photoCompleted);
  if (checks.length === 0) return (entry.customTasksCompleted?.length ?? 0) > 0;
  return checks.every(Boolean);
}

// Canonical streak computation — used by both the streak-update Cloud-facing function
// and the history page. The history.tsx local copy was the more correct one; this
// matches that logic exactly.
export function computeStreakFromHistory(history: DayEntry[], challengeStartDate?: string | null): { current: number; longest: number } {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const today = format(new Date(), 'yyyy-MM-dd');
  let current = 0, longest = 0, streak = 0;
  const hasTodayComplete = sorted.some((e) => e.date === today && e.allCoreCompleted);
  let expected = hasTodayComplete ? today : format(subDays(new Date(), 1), 'yyyy-MM-dd');

  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (challengeStartDate && entry.date < challengeStartDate) {
      if (current === 0) current = streak;
      longest = Math.max(longest, streak);
      break;
    }
    if (entry.date < expected) {
      if (current === 0) current = streak;
      longest = Math.max(longest, streak);
      streak = 0;
      expected = format(subDays(parseISO(expected), 1), 'yyyy-MM-dd');
      if (entry.date < expected) break;
    }
    if (!entry.allCoreCompleted) {
      if (current === 0) current = streak;
      if (entry.date !== today) { longest = Math.max(longest, streak); streak = 0; }
      expected = format(subDays(parseISO(entry.date), 1), 'yyyy-MM-dd');
      continue;
    }
    streak++;
    longest = Math.max(longest, streak);
    expected = format(subDays(parseISO(entry.date), 1), 'yyyy-MM-dd');
  }
  if (current === 0) current = streak;
  longest = Math.max(longest, streak);
  return { current, longest };
}

export function computeDayPoints(entry: DayEntry, customTasks: CustomTask[], profile?: UserProfile): number {
  const isGeneral = profile?.challengeMode === 'general';
  const hidden = isGeneral ? (profile?.hiddenCoreTasks ?? {}) : {};

  let pts = 0;
  if (entry.workoutOneCompleted && !hidden.workout1) pts += TASK_POINTS.workout1;
  if (entry.workoutTwoCompleted && !hidden.workout2) pts += TASK_POINTS.workout2;
  if (entry.dietCompleted && !hidden.diet)           pts += TASK_POINTS.diet;
  if (entry.waterCompleted && !hidden.water)         pts += TASK_POINTS.water;
  if (entry.readingCompleted && !hidden.reading)     pts += TASK_POINTS.reading;
  if (entry.photoCompleted && !hidden.photo)         pts += TASK_POINTS.photo;
  if (entry.allCoreCompleted) pts += PERFECT_DAY_BONUS;
  if (!hidden.reading) pts += computeReadingBonus(entry.pagesRead ?? 0, entry.readingCompleted);
  if (!hidden.water)   pts += computeWaterBonus(entry.waterOzLogged ?? 0, entry.waterCompleted);
  let customPts = 0;
  for (const taskId of (entry.customTasksCompleted ?? [])) {
    const task = customTasks.find((t) => t.id === taskId);
    if (task?.points) customPts += task.points;
  }
  pts += Math.min(customPts, CUSTOM_TASK_DAILY_CAP);
  return pts;
}
