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

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  const avatarMap: Record<string, string> = {
    'eli.patrick.manning@gmail.com': '/avatars/eli.png',
    'rocket@gmail.com': '/avatars/rocket.png',
  };
  const avatarUrl = avatarMap[email.toLowerCase()] ?? '/avatars/default.png';

  await createUserProfile({
    uid,
    displayName,
    avatarUrl,
    email,
    challengeStartDate: format(new Date(), 'yyyy-MM-dd'),
    isActive: true,
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
