import { useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useMinDuration } from '../hooks/useMinDuration';
import { LoadingScreen } from './LoadingScreen';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const visible = useMinDuration(loading);
  const router = useRouter();

  useEffect(() => {
    if (!visible && !user) {
      router.replace('/login');
    }
  }, [user, visible, router]);

  if (visible || !user) return <LoadingScreen />;

  return <>{children}</>;
}
