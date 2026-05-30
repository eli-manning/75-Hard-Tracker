import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Unsubscribe,
  UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { getUserProfile, createUserProfile } from './firestore';
import { format } from 'date-fns';

const provider = new GoogleAuthProvider();

const AVATAR_MAP: Record<string, string> = {
  'eli@themannings.com': '/avatars/eli.png',
  'rocketeloise@rocketmail.com': '/avatars/rocket.png',
};

export async function signInWithGoogle(): Promise<UserCredential> {
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  const { uid, email, displayName } = credential.user;

  // Create profile on first sign-in only
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

  return credential;
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
