import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { getUserProfile, createUserProfile } from './firestore';
import { format } from 'date-fns';

const provider = new GoogleAuthProvider();

const AVATAR_MAP: Record<string, string> = {
  'eli@themannings.com': '/avatars/eli.png',
  'rocketeloise@rocketmail.com': '/avatars/rocket.png',
};

async function ensureProfile(user: User): Promise<void> {
  const { uid, email, displayName } = user;
  const existing = await getUserProfile(uid);
  if (!existing) {
    const emailKey = (email ?? '').toLowerCase();
    await createUserProfile({
      uid,
      displayName: displayName ?? email ?? 'User',
      avatarUrl: AVATAR_MAP[emailKey] ?? '/avatars/default.png',
      email: email ?? '',
      challengeStartDate: format(new Date(), 'yyyy-MM-dd'),
      isActive: true,
      currentStreak: 0,
      longestStreak: 0,
    });
  }
}

// Kicks off the Google redirect flow — returns immediately (page navigates away)
export function signInWithGoogle(): void {
  signInWithRedirect(getFirebaseAuth(), provider);
}

// Call on login page mount — resolves redirect result if returning from Google
export async function handleGoogleRedirect(): Promise<User | null> {
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    if (!result) return null;
    await ensureProfile(result.user);
    return result.user;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
