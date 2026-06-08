import { Platform } from 'react-native';
import { Tabs, Redirect, usePathname } from 'expo-router';
import { AuthGuard } from '../../components/AuthGuard';
import { BottomNav } from '../../components/BottomNav';
import { useNavVisibility } from '../../context/NavVisibilityContext';
import { useTheme } from '../../context/ThemeContext';
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  const { navHidden } = useNavVisibility();
  const { theme, isRocketMode } = useTheme();
  const pathname = usePathname();

  // Redirect Rocket away from hidden tabs
  if (isRocketMode && (pathname.includes('/crews') || pathname.includes('/leaderboard'))) {
    return <Redirect href="/(tabs)/today" />;
  }

  return (
    <AuthGuard>
      <Tabs
        tabBar={Platform.OS === 'web' ? () => null : () => navHidden ? null : <BottomNav />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { paddingBottom: TAB_BAR_CONTENT_HEIGHT, backgroundColor: theme.bg, borderWidth: 0 },
        }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="crews" options={isRocketMode ? { href: null } : {}} />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="leaderboard" options={isRocketMode ? { href: null } : {}} />
      </Tabs>
    </AuthGuard>
  );
}
