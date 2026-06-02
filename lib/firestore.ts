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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { UserProfile, DayEntry, CustomTask } from './types';
import { getCached, setCached, invalidate } from './cache';
import { differenceInDays, parseISO, subDays } from 'date-fns';

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
  });
}

export async function updateStreakOnProfile(uid: string): Promise<void> {
  invalidate(`history-${uid}`);
  const history = await getDayHistory(uid, 120);
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const { format } = await import('date-fns');
  const today = format(new Date(), 'yyyy-MM-dd');

  let current = 0;
  let longest = 0;
  let streak = 0;
  const hasTodayComplete = sorted.some((e) => e.date === today && e.allCoreCompleted);
  let expected = hasTodayComplete ? today : format(subDays(new Date(), 1), 'yyyy-MM-dd');

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
  invalidate(`profile-${uid}`);
  invalidate('all-users');
}

// ── Friends ───────────────────────────────────────────────────────────────────

// Returns true if both sides had pending requests and were auto-accepted as friends
export async function sendFriendRequest(fromUid: string, toUid: string): Promise<boolean> {
  // If the other person already sent us a request, just accept it immediately
  const mutualRef = doc(db(), 'friendRequests', fromUid, 'incoming', toUid);
  const mutual = await getDoc(mutualRef);
  if (mutual.exists()) {
    await acceptFriendRequest(fromUid, toUid);
    return true;
  }
  await setDoc(doc(db(), 'friendRequests', toUid, 'incoming', fromUid), {
    fromUid,
    toUid,
    createdAt: serverTimestamp(),
  });
  return false;
}

export async function getPendingRequests(uid: string): Promise<string[]> {
  const ref = collection(db(), 'friendRequests', uid, 'incoming');
  const snap = await getDocs(ref);
  return snap.docs.map((d) => d.data().fromUid as string);
}

export async function acceptFriendRequest(currentUid: string, fromUid: string): Promise<void> {
  const batch = writeBatch(db());
  batch.update(doc(db(), 'users', currentUid), { friends: arrayUnion(fromUid) });
  batch.update(doc(db(), 'users', fromUid), { friends: arrayUnion(currentUid) });
  batch.delete(doc(db(), 'friendRequests', currentUid, 'incoming', fromUid));
  await batch.commit();
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
  const { deleteField } = await import('firebase/firestore');
  // Firestore rejects undefined — convert to deleteField() to remove the field
  const safe: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(updates)) {
    safe[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(doc(db(), 'days', uid, 'entries', date), safe);
  invalidate(`history-${uid}`);
}

export async function getDayHistory(
  uid: string,
  limitCount = 90
): Promise<DayEntry[]> {
  const key = `history-${uid}`;
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
