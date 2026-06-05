import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { UserProfile, DayEntry, CustomTask } from './types';
import { getCached, setCached, invalidate } from './cache';
import { computeStreakFromHistory } from './points';
import { differenceInDays, parseISO } from 'date-fns';

function db() {
  return getFirebaseDb();
}

function invalidateHistory(uid: string): void {
  invalidate(`history-${uid}-90`);
  invalidate(`history-${uid}-120`);
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
  const cached = getCached<UserProfile[]>('all-users');
  if (cached) return cached;
  const snap = await getDocs(collection(db(), 'users'));
  const users = snap.docs.map((d) => d.data() as UserProfile);
  setCached('all-users', users);
  return users;
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

export function subscribeToProfile(
  uid: string,
  onChange: (profile: UserProfile) => void
): () => void {
  return onSnapshot(doc(db(), 'users', uid), (snap) => {
    if (!snap.exists()) return;
    const profile = snap.data() as UserProfile;
    setCached(`profile-${uid}`, profile);
    onChange(profile);
  }, (err) => {
    if (err.code !== 'permission-denied') console.error(err);
  });
}

export async function incrementUserPoints(uid: string, delta: number): Promise<void> {
  if (delta === 0) return;
  const userRef = doc(db(), 'users', uid);
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(userRef);
    const current = (snap.data()?.totalPoints ?? 0) as number;
    tx.update(userRef, { totalPoints: Math.max(0, current + delta) });
  });
  invalidate(`profile-${uid}`);
  invalidate('all-users');
}

export async function getGlobalLeaderboard(): Promise<UserProfile[]> {
  const ref = collection(db(), 'users');
  // Server-side sort + limit avoids a full collection scan
  const q = query(ref, orderBy('totalPoints', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.isActive && u.leaderboardOptOut === false);
}

export async function updateStreakOnProfile(uid: string): Promise<void> {
  invalidateHistory(uid);
  const history = await getDayHistory(uid, 120);
  const { current, longest } = computeStreakFromHistory(history);
  await updateDoc(doc(db(), 'users', uid), { currentStreak: current, longestStreak: longest });
  invalidate(`profile-${uid}`);
  invalidate('all-users');
}

// ── Friends ───────────────────────────────────────────────────────────────────

// Returns true if both sides had pending requests and were auto-accepted as friends.
// The check-and-write is wrapped in a transaction to prevent duplicate outgoing docs
// when two users send each other a request simultaneously.
export async function sendFriendRequest(fromUid: string, toUid: string): Promise<boolean> {
  const mutualRef = doc(db(), 'friendRequests', fromUid, 'incoming', toUid);
  const outgoingRef = doc(db(), 'friendRequests', toUid, 'incoming', fromUid);
  let hasMutual = false;
  await runTransaction(db(), async (tx) => {
    const mutual = await tx.get(mutualRef);
    hasMutual = mutual.exists();
    if (!hasMutual) {
      tx.set(outgoingRef, { fromUid, toUid, createdAt: serverTimestamp() });
    }
  });
  if (hasMutual) {
    await acceptFriendRequest(fromUid, toUid);
    return true;
  }
  return false;
}

export async function getPendingRequests(uid: string): Promise<string[]> {
  const ref = collection(db(), 'friendRequests', uid, 'incoming');
  const snap = await getDocs(ref);
  return snap.docs.map((d) => d.data().fromUid as string);
}

export async function acceptFriendRequest(currentUid: string, fromUid: string): Promise<void> {
  // Commit the friendship first so both users' friends arrays are updated before
  // the Cloud Function fires (which it does when status becomes 'accepted').
  const batch = writeBatch(db());
  batch.update(doc(db(), 'users', currentUid), { friends: arrayUnion(fromUid) });
  batch.update(doc(db(), 'users', fromUid), { friends: arrayUnion(currentUid) });
  await batch.commit();
  await updateDoc(doc(db(), 'friendRequests', currentUid, 'incoming', fromUid), { status: 'accepted' });
  invalidate(`profile-${currentUid}`);
  invalidate(`profile-${fromUid}`);
  invalidate('all-users');
}

export async function declineFriendRequest(currentUid: string, fromUid: string): Promise<void> {
  await deleteDoc(doc(db(), 'friendRequests', currentUid, 'incoming', fromUid));
}

export async function removeFriend(currentUid: string, friendUid: string): Promise<void> {
  const batch = writeBatch(db());
  batch.update(doc(db(), 'users', currentUid), { friends: arrayRemove(friendUid) });
  batch.update(doc(db(), 'users', friendUid), { friends: arrayRemove(currentUid) });
  await batch.commit();
  invalidate(`profile-${currentUid}`);
  invalidate(`profile-${friendUid}`);
  invalidate('all-users');
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
  // Firestore rejects undefined — convert to deleteField() to remove the field
  const safe: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(updates)) {
    safe[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(doc(db(), 'days', uid, 'entries', date), safe);
  invalidateHistory(uid);
}

// Atomically updates a day entry and the user's totalPoints in one transaction,
// flooring totalPoints at 0. Use this for all task-toggle writes.
export async function updateDayEntryWithPoints(
  uid: string,
  date: string,
  updates: Partial<DayEntry>,
  pointsDelta: number,
): Promise<void> {
  const entryRef = doc(db(), 'days', uid, 'entries', date);
  const userRef = doc(db(), 'users', uid);

  const safe: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(updates)) {
    safe[k] = v === undefined ? deleteField() : v;
  }

  if (pointsDelta !== 0) {
    await runTransaction(db(), async (tx) => {
      const userSnap = await tx.get(userRef);
      const current = (userSnap.data()?.totalPoints ?? 0) as number;
      tx.update(entryRef, safe);
      tx.update(userRef, { totalPoints: Math.max(0, current + pointsDelta) });
    });
    invalidate(`profile-${uid}`);
    invalidate('all-users');
  } else {
    await updateDoc(entryRef, safe);
  }
  invalidateHistory(uid);
}

export async function getDayHistory(
  uid: string,
  limitCount = 90
): Promise<DayEntry[]> {
  // Include limitCount in the key so a 90-entry result never masks a 120-entry request
  const key = `history-${uid}-${limitCount}`;
  const cached = getCached<DayEntry[]>(key);
  if (cached) return cached;
  const ref = collection(db(), 'days', uid, 'entries');
  const q = query(ref, orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const entries = snap.docs.map((d) => d.data() as DayEntry);
  setCached(key, entries);
  return entries;
}

// ── Custom Tasks ──────────────────────────────────────────────────────────────

export async function getCustomTasks(uid: string): Promise<CustomTask[]> {
  const ref = collection(db(), 'customTasks', uid, 'tasks');
  const q = query(ref, orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CustomTask);
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function createCustomTask(
  task: Omit<CustomTask, 'id' | 'createdAt'>
): Promise<void> {
  const ref = doc(collection(db(), 'customTasks', task.uid, 'tasks'));
  await setDoc(ref, { ...stripUndefined(task), id: ref.id, createdAt: serverTimestamp() });
}

export async function updateCustomTask(
  uid: string,
  taskId: string,
  updates: Partial<CustomTask>
): Promise<void> {
  const cleaned = Object.fromEntries(
    Object.entries(updates).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  );
  await updateDoc(doc(db(), 'customTasks', uid, 'tasks', taskId), cleaned);
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
