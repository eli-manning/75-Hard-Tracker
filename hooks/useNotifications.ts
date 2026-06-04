import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb, getFirebaseMessaging } from '../lib/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications(uid: string | undefined) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!uid) return;
    if (Platform.OS === 'web') {
      checkWebPermission();
    } else {
      checkNativePermission();
    }
  }, [uid]);

  // ── Native (iOS / Android) ────────────────────────────────────────────────

  async function checkNativePermission() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      await fetchAndSaveNativeToken();
    }
  }

  async function fetchAndSaveNativeToken() {
    if (!uid) return;
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;
      const { data } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      setToken(data);
      await updateDoc(doc(getFirebaseDb(), 'users', uid), { expoPushToken: data });
    } catch {
      // Fails in Expo Go without EAS project ID or on simulators
    }
  }

  // ── Web (PWA) ─────────────────────────────────────────────────────────────

  async function checkWebPermission() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      setPermissionGranted(true);
      await fetchAndSaveWebToken();
    }
  }

  async function fetchAndSaveWebToken() {
    if (!uid) return;
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      const { getToken, isSupported } = await import('firebase/messaging');
      const supported = await isSupported();
      if (!supported) return;
      const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;
      const swReg = await navigator.serviceWorker.ready;
      const fcmToken = await getToken(messaging as any, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });
      if (!fcmToken) return;
      setToken(fcmToken);
      await updateDoc(doc(getFirebaseDb(), 'users', uid), { fcmWebToken: fcmToken });
    } catch (err) {
      console.error('[FCM] token registration failed:', err);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      if (granted) await fetchAndSaveNativeToken();
      return granted;
    }

    if (typeof Notification === 'undefined') return false;
    const status = await Notification.requestPermission();
    const granted = status === 'granted';
    setPermissionGranted(granted);
    if (granted) await fetchAndSaveWebToken();
    return granted;
  }

  async function clearTokens() {
    if (!uid) return;
    try {
      const patch: Record<string, null> = { expoPushToken: null };
      if (Platform.OS === 'web') patch.fcmWebToken = null;
      await updateDoc(doc(getFirebaseDb(), 'users', uid), patch);
    } catch {}
  }

  return { permissionGranted, token, requestPermission, clearTokens };
}
