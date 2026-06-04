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
  expoPushToken?: string;    // native iOS/Android
  fcmWebToken?: string;      // PWA web push
  notifAllEnabled?: boolean;
  notifDailyEnabled?: boolean;
  notifDailyTime?: string; // "HH:MM" 24h
  notifNudgesEnabled?: boolean;
  notifFriendRequestsEnabled?: boolean;
  totalPoints?: number;
  challengeMode?: '75hard' | 'general';
  leaderboardOptOut?: boolean; // default false (opted in)
  nudgesRemaining?: number;       // free nudges left today (max 5, default 5 if absent)
  purchasedNudgesToday?: number;  // paid nudges used today (max 5)
  nudgeResetDate?: string;        // "YYYY-MM-DD" — date of last reset
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
  dailyPoints?: number;
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
  visible?: boolean; // whether friends can see this task (defaults to true)
  why?: string;
  points?: number; // 1-10, optional point value for this task
}
