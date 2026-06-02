import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  dicebearSeed?: string;
  email: string;
  createdAt: Timestamp;
  challengeStartDate: string; // "YYYY-MM-DD"
  isActive: boolean;
  currentStreak: number;
  longestStreak: number;
  friends?: string[];
  // Fitness profile (set during onboarding, all optional)
  startingWeight?: number;
  weightUnit?: 'lbs' | 'kg';
  height?: number;             // inches when lbs, cm when kg
  fitnessGoal?: 'lose_weight' | 'build_muscle' | 'general_fitness' | 'mental_toughness';
  onboardingComplete?: boolean;
}

export interface DayEntry {
  date: string; // "YYYY-MM-DD"
  uid: string;

  workoutOneCompleted: boolean;
  workoutOneDuration: number;
  workoutTwoCompleted: boolean;
  workoutTwoDuration: number;
  workoutTwoOutdoor: boolean;
  dietCompleted: boolean;
  waterCompleted: boolean;
  waterOzLogged: number;
  photoCompleted: boolean;
  readingCompleted: boolean;
  pagesRead: number;

  customTasksCompleted: string[];

  // Optional daily metrics
  bodyWeight?: number;
  mood?: number;        // 1–5
  energyLevel?: number; // 1–5

  dayNumber: number;
  allCoreCompleted: boolean;
  updatedAt: Timestamp;
}

export interface CustomTask {
  id: string;
  uid: string;
  label: string;
  type: 'daily' | 'backlog';
  order: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  archived: boolean;
}
