import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';

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
    if (Platform.OS === 'web' || !uid) return;
    checkPermission();
  }, [uid]);

  async function checkPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      await fetchAndSaveToken();
    }
  }

  async function requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setPermissionGranted(granted);
    if (granted) await fetchAndSaveToken();
    return granted;
  }

  async function fetchAndSaveToken() {
    if (!uid) return;
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      const { data } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      setToken(data);
      await updateDoc(doc(getFirebaseDb(), 'users', uid), { expoPushToken: data });
    } catch {
      // Token fetch fails in Expo Go without EAS project ID or on simulators — safe to ignore
    }
  }

  return { permissionGranted, token, requestPermission };
}
