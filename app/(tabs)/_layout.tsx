import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { AuthGuard } from '../../components/AuthGuard';
import { BottomNav } from '../../components/BottomNav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_CONTENT_HEIGHT = 58; // icon + label + vertical padding

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // On native the nav extends below the safe area boundary so content only
  // needs to clear the 58px bar height. On web the nav is viewport-fixed and
  // includes env(safe-area-inset-bottom), so we add that too.
  const scenePadding = Platform.OS === 'web'
    ? TAB_BAR_CONTENT_HEIGHT + insets.bottom
    : TAB_BAR_CONTENT_HEIGHT;

  return (
    <AuthGuard>
      <Tabs
        tabBar={() => <BottomNav />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { paddingBottom: scenePadding },
        }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="history" />
      </Tabs>
    </AuthGuard>
  );
}
