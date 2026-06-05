import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { AuthGuard } from '../../components/AuthGuard';
import { BottomNav } from '../../components/BottomNav';
import { useNavVisibility } from '../../context/NavVisibilityContext';
import { colors } from '../../lib/theme';
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  const { navHidden } = useNavVisibility();
  return (
    <AuthGuard>
      <Tabs
        tabBar={Platform.OS === 'web' ? () => null : () => navHidden ? null : <BottomNav />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { paddingBottom: TAB_BAR_CONTENT_HEIGHT, backgroundColor: colors.bg, borderWidth: 0 },
        }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="leaderboard" />
      </Tabs>
    </AuthGuard>
  );
}
