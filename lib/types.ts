import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  createdAt: Timestamp;
  challengeStartDate: string; // "YYYY-MM-DD"
  isActive: boolean;
  currentStreak: number;      // Stored so the today page loads without an extra query
  longestStreak: number;
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
