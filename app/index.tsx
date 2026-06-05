import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useMinDuration } from '../hooks/useMinDuration';
import { LoadingScreen } from '../components/LoadingScreen';
import { getSessionCached, getCached } from '../lib/cache';
import { UserProfile } from '../lib/types';

export default function IndexPage() {
  const { user, loading } = useAuth();
  const visible = useMinDuration(loading);
  const router = useRouter();

  useEffect(() => {
    if (visible) return;
    if (user) {
      const profile =
        getSessionCached<UserProfile>('crewday-profile') ??
        getCached<UserProfile>(`profile-${user.uid}`);
      if (profile?.onboardingComplete === false) {
        router.replace('/onboarding' as any);
      } else {
        router.replace('/(tabs)/today');
      }
    } else {
      router.replace('/login');
    }
  }, [user, visible, router]);

  return <LoadingScreen showBar={false} />;
}

const styles = StyleSheet.create({});
