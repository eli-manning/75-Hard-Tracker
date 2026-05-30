import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Unsubscribe,
  UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { createUserProfile } from './firestore';
import { format } from 'date-fns';

const AVATAR_MAP: Record<string, string> = {
  'eli@themannings.com': '/avatars/eli.png',
  'rocketeloise@rocketmail.com': '/avatars/rocket.png',
};

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  const { uid } = credential.user;
  const emailKey = email.toLowerCase();
  await createUserProfile({
    uid,
    displayName: displayName.trim(),
    avatarUrl: AVATAR_MAP[emailKey] ?? '/avatars/default.png',
    email,
    challengeStartDate: format(new Date(), 'yyyy-MM-dd'),
    isActive: true,
    currentStreak: 0,
    longestStreak: 0,
  });
  return credential;
}

export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
