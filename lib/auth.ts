import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  getAdditionalUserInfo,
  User,
  Unsubscribe,
  UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { createUserProfile } from './firestore';
import { generateSeed } from './avatar';
import { setCached, setSessionCached, clearAll } from './cache';
import { format } from 'date-fns';

const CUSTOM_AVATAR_EMAILS = new Set([
  'eli@themannings.com',
  'rocketeloise@rocketmail.com',
]);

async function handleNewGoogleUser(user: User): Promise<void> {
  const { uid, email, displayName: googleName } = user;
  const emailKey = (email ?? '').toLowerCase();
  const isCustom = CUSTOM_AVATAR_EMAILS.has(emailKey);
  const newProfile = {
    uid,
    displayName: (googleName ?? email?.split('@')[0] ?? 'User').trim().slice(0, 100),
    avatarUrl: '/avatars/default.png',
    ...(isCustom ? {} : { dicebearSeed: generateSeed() }),
    email: email ?? '',
    challengeStartDate: format(new Date(), 'yyyy-MM-dd'),
    isActive: true,
    currentStreak: 0,
    longestStreak: 0,
    onboardingComplete: false,
  };
  setCached(`profile-${uid}`, newProfile);
  setSessionCached('crewday-profile', newProfile);
  await createUserProfile(newProfile);
}

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
  setSessionCached('crewday-profile', newProfile);
  await createUserProfile(newProfile);
  return credential;
}

// Web: uses signInWithPopup (requires no extra packages)
export async function signInWithGoogle(): Promise<{ isNewUser: boolean }> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;
  if (isNew) await handleNewGoogleUser(result.user);
  return { isNewUser: isNew };
}

// Native: receives an ID token from expo-auth-session and signs in via credential
export async function signInWithGoogleCredential(idToken: string): Promise<{ isNewUser: boolean }> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;
  if (isNew) await handleNewGoogleUser(result.user);
  return { isNewUser: isNew };
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
  return firebaseSignOut(getFirebaseAuth());
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
