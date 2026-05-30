import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { UserProfile, DayEntry, CustomTask } from './types';
import { getCached, setCached, invalidate } from './cache';
import { differenceInDays, parseISO } from 'date-fns';

function db() {
  return getFirebaseDb();
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const key = `profile-${uid}`;
  const cached = getCached<UserProfile>(key);
  if (cached) return cached;
  const snap = await getDoc(doc(db(), 'users', uid));
  const profile = snap.exists() ? (snap.data() as UserProfile) : null;
  if (profile) setCached(key, profile);
  return profile;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db(), 'users'));
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function createUserProfile(
  profile: Omit<UserProfile, 'createdAt'>
): Promise<void> {
  await setDoc(doc(db(), 'users', profile.uid), {
    ...profile,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  await updateDoc(doc(db(), 'users', uid), updates);
  invalidate(`profile-${uid}`);
}

export async function updateStreakOnProfile(uid: string): Promise<void> {
  const history = await getDayHistory(uid, 120);
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const { format } = await import('date-fns');
  const today = format(new Date(), 'yyyy-MM-dd');

  let current = 0;
  let longest = 0;
  let streak = 0;
  let expected = today;

  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (entry.date < expected) { longest = Math.max(longest, streak); streak = 0; break; }
    if (!entry.allCoreCompleted) {
      if (entry.date !== today) { longest = Math.max(longest, streak); if (current === 0) current = streak; streak = 0; }
      const d = new Date(entry.date); d.setDate(d.getDate() - 1);
      expected = format(d, 'yyyy-MM-dd');
      continue;
    }
    streak++;
    longest = Math.max(longest, streak);
    const d = new Date(entry.date); d.setDate(d.getDate() - 1);
    expected = format(d, 'yyyy-MM-dd');
  }
  if (current === 0) current = streak;
  longest = Math.max(longest, streak);

  await updateDoc(doc(db(), 'users', uid), { currentStreak: current, longestStreak: longest });
}

// ── Day Entries ───────────────────────────────────────────────────────────────

function defaultDayEntry(uid: string, date: string, challengeStartDate: string): Omit<DayEntry, 'updatedAt'> {
  const dayNumber =
    differenceInDays(parseISO(date), parseISO(challengeStartDate)) + 1;
  return {
    date,
    uid,
    workoutOneCompleted: false,
    workoutOneDuration: 45,
    workoutTwoCompleted: false,
    workoutTwoDuration: 45,
    workoutTwoOutdoor: false,
    dietCompleted: false,
    waterCompleted: false,
    waterOzLogged: 0,
    photoCompleted: false,
    readingCompleted: false,
    pagesRead: 0,
    customTasksCompleted: [],
    dayNumber, // negative/zero means challenge hasn't started yet
    allCoreCompleted: false,
  };
}

export async function getOrCreateDayEntry(
  uid: string,
  date: string,
  challengeStartDate: string
): Promise<DayEntry> {
  const ref = doc(db(), 'days', uid, 'entries', date);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as DayEntry;

  const entry = {
    ...defaultDayEntry(uid, date, challengeStartDate),
    updatedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(ref, entry);
  return entry as DayEntry;
}

export async function updateDayEntry(
  uid: string,
  date: string,
  updates: Partial<DayEntry>
): Promise<void> {
  await updateDoc(doc(db(), 'days', uid, 'entries', date), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function getDayHistory(
  uid: string,
  limitCount = 90
): Promise<DayEntry[]> {
  const ref = collection(db(), 'days', uid, 'entries');
  const q = query(ref, orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DayEntry);
}

// ── Custom Tasks ──────────────────────────────────────────────────────────────

export async function getCustomTasks(uid: string): Promise<CustomTask[]> {
  const ref = collection(db(), 'customTasks', uid, 'tasks');
  const q = query(ref, orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CustomTask);
}

export async function createCustomTask(
  task: Omit<CustomTask, 'id' | 'createdAt'>
): Promise<void> {
  const ref = doc(collection(db(), 'customTasks', task.uid, 'tasks'));
  await setDoc(ref, { ...task, id: ref.id, createdAt: serverTimestamp() });
}

export async function updateCustomTask(
  uid: string,
  taskId: string,
  updates: Partial<CustomTask>
): Promise<void> {
  await updateDoc(doc(db(), 'customTasks', uid, 'tasks', taskId), updates);
}

export async function archiveCustomTask(
  uid: string,
  taskId: string
): Promise<void> {
  await updateDoc(doc(db(), 'customTasks', uid, 'tasks', taskId), {
    archived: true,
  });
}

export async function reorderCustomTasks(
  uid: string,
  orderedIds: string[]
): Promise<void> {
  const batch = writeBatch(db());
  orderedIds.forEach((id, index) => {
    batch.update(doc(db(), 'customTasks', uid, 'tasks', id), { order: index });
  });
  await batch.commit();
}
