'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
          LOADING...
        </span>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
