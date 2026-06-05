import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { useAuthContext } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { useNotifications } from '../hooks/useNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const { loading: authLoading, user } = useAuthContext();
  // Silently refresh push token on every app open for users who already granted permission
  useNotifications(user?.uid);
  const pathname = usePathname();
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
    if (fontsLoaded && !authLoading && minElapsed) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, authLoading, minElapsed]);

  const screens = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0c1018' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );

  // On web, show BottomNav as a sibling inside webFrame (avoids React Navigation
  // overflow:hidden clipping AND the body overflow:hidden + position:fixed iOS Safari bug).
  const showWebNav = Platform.OS === 'web' &&
    ['/today', '/tasks', '/history'].some(p => pathname.startsWith(p));


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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c1018',
  },
  webCenter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0c1018',
    width: '100%',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});