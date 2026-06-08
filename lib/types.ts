import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  dicebearSeed?: string;
  email: string;
  createdAt: Timestamp;
  challengeStartDate: string | null; // "YYYY-MM-DD" for 75hard, null for general
  isActive: boolean;
  currentStreak: number;
  longestStreak: number;
  friends?: string[];
  crews?: string[];           // crewIds the user belongs to
  // Fitness profile (set during onboarding, all optional)
  startingWeight?: number;
  weightUnit?: 'lbs' | 'kg';
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
  hiddenCoreTasks?: {
    workout1?: boolean;
    workout2?: boolean;
    diet?: boolean;
    water?: boolean;
    reading?: boolean;
    photo?: boolean;
  };
  leaderboardOptOut?: boolean; // undefined means not yet on leaderboard (opted out); false means explicitly opted in
  nudgesRemaining?: number;       // free nudges left today (max 5, default 5 if absent)
  purchasedNudgesToday?: number;  // paid nudges used today (max 5)
  nudgeResetDate?: string;        // "YYYY-MM-DD" — date of last reset
  missedDayPromptShownDate?: string; // "YYYY-MM-DD" — last date we showed the missed-day prompt
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
  crewTasksCompleted?: string[]; // IDs of completed crew custom tasks
  customTaskProgress?: Record<string, number>; // taskId -> logged amount for goal-based tasks

  // Optional daily metrics
  bodyWeight?: number;
  mood?: number;        // 1–5
  energyLevel?: number; // 1–5

  dayNumber: number;
  allCoreCompleted: boolean;
  updatedAt: Timestamp;
  dailyPoints?: number;
}

export interface CrewTask {
  id: string;    // uuid generated client-side
  label: string; // max 60 chars
  order: number;
  amount?: number;
  unit?: string;
}

export interface Crew {
  id: string;
  name: string;              // display name, max 30 chars
  icon: string;              // preset icon key
  joinCode: string;          // 6-char all-caps unique code
  creatorUid: string;
  members: string[];
  admins: string[];
  activeTasks: {
    workout1: boolean;
    workout2: boolean;
    diet: boolean;
    water: boolean;
    reading: boolean;
    photo: boolean;
  };
  customCrewTasks: CrewTask[];
  crewStreak: number;
  longestCrewStreak: number;
  lastStreakDate: string; // YYYY-MM-DD
  lastSummaryDate?: string; // YYYY-MM-DD — idempotency guard for onDayEntryUpdated
  createdAt: Timestamp;
}

export interface CrewDaySummary {
  crewId: string;
  date: string;
  memberResults: {
    uid: string;
    displayName: string;
    completed: boolean;
    points: number;
    inactive: boolean;
  }[];
  streakSurvived: boolean;
  newStreak: number;
  mvpUid: string | null;
  pushedAt: Timestamp;
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
  amount?: number; // display badge only (e.g. "5 MILES")
  unit?: string;   // display badge only
  goalAmount?: number; // enables progress tracker; undefined = plain checkbox
  goalUnit?: string;   // unit label for progress tracker
}
