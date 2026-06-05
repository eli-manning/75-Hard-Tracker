import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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

export async function signInWithGoogle(): Promise<{ isNewUser: boolean }> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(getFirebaseAuth(), provider);
  const isNew = getAdditionalUserInfo(result)?.isNewUser ?? false;

  if (isNew) {
    const { uid, email, displayName: googleName } = result.user;
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
