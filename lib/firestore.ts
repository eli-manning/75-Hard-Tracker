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
import { differenceInDays, parseISO } from 'date-fns';

function db() {
  return getFirebaseDb();
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
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
    dayNumber: Math.max(1, dayNumber),
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
