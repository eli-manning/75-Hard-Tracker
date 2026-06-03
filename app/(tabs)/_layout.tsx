import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { AuthGuard } from '../../components/AuthGuard';
import { BottomNav } from '../../components/BottomNav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_CONTENT_HEIGHT = 58; // icon + label + vertical padding

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <AuthGuard>
      <Tabs
        tabBar={() => <BottomNav />}
        screenOptions={{
          headerShown: false,
          sceneStyle: Platform.OS === 'web'
            ? { paddingBottom: 'calc(58px + env(safe-area-inset-bottom))' as any }
            : { paddingBottom: tabBarHeight },
        }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="history" />
      </Tabs>
    </AuthGuard>
  );
}
