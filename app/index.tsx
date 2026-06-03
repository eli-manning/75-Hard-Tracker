import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/LoadingScreen';
import { getSessionCached, getCached } from '../lib/cache';
import { UserProfile } from '../lib/types';

export default function IndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      const profile =
        getSessionCached<UserProfile>('75hard-profile') ??
        getCached<UserProfile>(`profile-${user.uid}`);
      if (profile?.onboardingComplete === false) {
        router.replace('/onboarding' as any);
      } else {
        router.replace('/(tabs)/today');
      }
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return <LoadingScreen />;
}

const styles = StyleSheet.create({});
