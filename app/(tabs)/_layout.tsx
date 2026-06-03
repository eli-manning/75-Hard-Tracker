import { Tabs } from 'expo-router';
import { AuthGuard } from '../../components/AuthGuard';
import { BottomNav } from '../../components/BottomNav';
const TAB_BAR_CONTENT_HEIGHT = 58;

export default function TabsLayout() {
  return (
    <AuthGuard>
      <Tabs
        tabBar={() => <BottomNav />}
        screenOptions={{
          headerShown: false,
          // sceneStyle: { paddingBottom: TAB_BAR_CONTENT_HEIGHT },
        }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="history" />
      </Tabs>
    </AuthGuard>
  );
}
