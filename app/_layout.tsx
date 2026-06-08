import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '../lib/theme';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { useAuthContext } from '../context/AuthContext';
import { NavVisibilityProvider, useNavVisibility } from '../context/NavVisibilityContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { BottomNav } from '../components/BottomNav';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const { loading: authLoading, user } = useAuthContext();
  const { navHidden } = useNavVisibility();
  const pathname = usePathname();
  const router = useRouter();

  // Deep-link navigation from push notification taps (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (data?.type === 'crew_complete' && data.crewId && data.date) {
        router.push(`/crews/summary/${data.crewId}/${data.date}` as any);
      }
    });
    return () => sub.remove();
  }, []);
  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
    VT323_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = '* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (fontsLoaded && !authLoading && minElapsed) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, authLoading, minElapsed]);

  const screens = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );

  // On web, show BottomNav as a sibling inside webFrame (avoids React Navigation
  // overflow:hidden clipping AND the body overflow:hidden + position:fixed iOS Safari bug).
  const showWebNav = Platform.OS === 'web' &&
    fontsLoaded && !authLoading && minElapsed && !navHidden &&
    ['/today', '/crews', '/history', '/leaderboard'].includes(pathname);


  return (
    <View style={styles.root}>
      {Platform.OS === 'web' ? (
        <View style={styles.webCenter}>
          <View style={styles.webFrame}>
            {screens}
            {showWebNav && <BottomNav />}
          </View>
        </View>
      ) : screens}
    </View>
  );
}

function AppWithNotifications() {
  const { user } = useAuthContext();
  return (
    <NotificationsProvider uid={user?.uid}>
      <NavVisibilityProvider>
        <StatusBar style="light" />
        <AppShell />
      </NavVisibilityProvider>
    </NotificationsProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppWithNotifications />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webCenter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bg,
    width: '100%',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});