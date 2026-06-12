import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Unsubscribe,
  UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { createUserProfile } from './firestore';
import { generateSeed } from './avatar';
import { setCached, setSessionCached, clearAll } from './cache';
import { format } from 'date-fns';

const CUSTOM_AVATAR_EMAILS = new Set(
  (process.env.NEXT_PUBLIC_CUSTOM_AVATAR_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
);

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  const { uid } = credential.user;
  const emailKey = email.toLowerCase();
  const isCustom = CUSTOM_AVATAR_EMAILS.has(emailKey);
  const newProfile = {
    uid,
    displayName: displayName.trim().slice(0, 100),
    avatarUrl: '/avatars/default.png',
    ...(isCustom ? {} : { dicebearSeed: generateSeed() }),
    email,
    challengeStartDate: format(new Date(), 'yyyy-MM-dd'),
    isActive: true,
    currentStreak: 0,
    longestStreak: 0,
    onboardingComplete: false,
  };
  // Pre-populate caches before the Firestore write so the today page has the
  // profile immediately — onAuthStateChanged fires before createUserProfile resolves.
  setCached(`profile-${uid}`, newProfile);
  setSessionCached('75hard-profile', newProfile);
  await createUserProfile(newProfile);
  return credential;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signOut(): Promise<void> {
  clearAll();
  if (typeof window !== 'undefined') sessionStorage.clear();
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
