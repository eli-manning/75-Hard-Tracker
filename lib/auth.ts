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
import { format } from 'date-fns';

const CUSTOM_AVATAR_EMAILS = new Set([
  'eli@themannings.com',
  'rocketeloise@rocketmail.com',
]);

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  const { uid } = credential.user;
  const emailKey = email.toLowerCase();
  const isCustom = CUSTOM_AVATAR_EMAILS.has(emailKey);
  await createUserProfile({
    uid,
    displayName: displayName.trim(),
    avatarUrl: '/avatars/default.png',
    ...(isCustom ? {} : { dicebearSeed: generateSeed() }),
    email,
    challengeStartDate: format(new Date(), 'yyyy-MM-dd'),
    isActive: true,
    currentStreak: 0,
    longestStreak: 0,
  });
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
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
