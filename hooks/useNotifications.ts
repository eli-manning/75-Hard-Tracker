import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { getFirebaseDb, getFirebaseMessaging } from '../lib/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function clearTokensForUid(uid: string): Promise<void> {
  try {
    const patch: Record<string, ReturnType<typeof deleteField>> = { expoPushToken: deleteField() };
    if (Platform.OS === 'web') patch.fcmWebToken = deleteField();
    await updateDoc(doc(getFirebaseDb(), 'users', uid), patch);
  } catch {}
}

export function useNotifications(uid: string | undefined) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [token, setToken] = useState<string | undefined>(undefined);
  const prevUidRef = useRef<string | undefined>(undefined);

  // Clear push tokens from Firestore when the user signs out (uid: defined → undefined)
  useEffect(() => {
    const prev = prevUidRef.current;
    prevUidRef.current = uid;
    if (prev && !uid) {
      clearTokensForUid(prev);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    if (Platform.OS === 'web') {
      checkWebPermission();
    } else {
      checkNativePermission();
    }

    return () => { cancelled = true; };

    async function checkNativePermission() {
      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled) return;
      if (status === 'granted') {
        setPermissionGranted(true);
        await fetchAndSaveNativeToken();
      }
    }

    async function fetchAndSaveNativeToken() {
      if (!uid || cancelled) return;
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as any).easConfig?.projectId;
        const { data } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled) return;
        setToken(data);
        await updateDoc(doc(getFirebaseDb(), 'users', uid), { expoPushToken: data });
      } catch {
        // Fails in Expo Go without EAS project ID or on simulators
      }
    }

    async function checkWebPermission() {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (!cancelled) setPermissionGranted(true);
      await fetchAndSaveWebToken();
    }

    async function fetchAndSaveWebToken() {
      if (!uid || cancelled) return;
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging || cancelled) return;
        const { getToken, isSupported } = await import('firebase/messaging');
        const supported = await isSupported();
        if (!supported || cancelled) return;
        const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;
        const swReg = await navigator.serviceWorker.ready;
        if (cancelled) return;
        const fcmToken = await getToken(messaging as any, {
          vapidKey,
          serviceWorkerRegistration: swReg,
        });
        if (!fcmToken || cancelled) return;
        setToken(fcmToken);
        await updateDoc(doc(getFirebaseDb(), 'users', uid), { fcmWebToken: fcmToken });
      } catch (err) {
        console.error('[FCM] token registration failed:', err);
      }
    }
  }, [uid]);

  // ── Public API ────────────────────────────────────────────────────────────

  async function requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      if (granted && uid) {
        try {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            (Constants as any).easConfig?.projectId;
          const { data } = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
          );
          setToken(data);
          await updateDoc(doc(getFirebaseDb(), 'users', uid), { expoPushToken: data });
        } catch {}
      }
      return granted;
    }

    if (typeof Notification === 'undefined') return false;
    const status = await Notification.requestPermission();
    const granted = status === 'granted';
    setPermissionGranted(granted);
    if (granted && uid) {
      try {
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          const { getToken, isSupported } = await import('firebase/messaging');
          const supported = await isSupported();
          if (supported) {
            const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
            if (vapidKey) {
              const swReg = await navigator.serviceWorker.ready;
              const fcmToken = await getToken(messaging as any, {
                vapidKey,
                serviceWorkerRegistration: swReg,
              });
              if (fcmToken) {
                setToken(fcmToken);
                await updateDoc(doc(getFirebaseDb(), 'users', uid), { fcmWebToken: fcmToken });
              }
            }
          }
        }
      } catch (err) {
        console.error('[FCM] token registration failed:', err);
      }
    }
    return granted;
  }

  async function clearTokens() {
    if (!uid) return;
    await clearTokensForUid(uid);
  }

  return { permissionGranted, token, requestPermission, clearTokens };
}
