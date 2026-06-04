import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Auth, initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _messaging: unknown | undefined;

function getApp(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = getApp();
  if (Platform.OS !== 'web') {
    try {
      _auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (e: any) {
      // Already initialized on hot reload — reuse the existing instance
      if (e?.code === 'auth/already-initialized') {
        _auth = getAuth(app);
      } else {
        throw e;
      }
    }
  } else {
    _auth = getAuth(app);
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export async function getFirebaseMessaging(): Promise<unknown | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!_messaging) {
    const { getMessaging } = await import('firebase/messaging');
    _messaging = getMessaging(getApp());
  }
  return _messaging;
}

// Eagerly warm Firebase so auth state is ready immediately
try {
  getFirebaseAuth();
  getFirebaseDb();
} catch (e) {
  console.warn('Firebase init error:', e);
}
