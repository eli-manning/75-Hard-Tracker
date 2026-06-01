'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/today' : '/login');
    }
  }, [user, loading, router]);

  // Show loader while Firebase resolves auth — prevents a black screen on new devices
  return <LoadingScreen />;
}
