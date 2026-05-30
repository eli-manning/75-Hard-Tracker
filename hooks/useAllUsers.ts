'use client';

import { useEffect, useState } from 'react';
import { getAllUsers } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { getCached, setCached } from '@/lib/cache';

const CACHE_KEY = 'all-users';

export function useAllUsers() {
  const cached = getCached<UserProfile[]>(CACHE_KEY);
  const [users, setUsers] = useState<UserProfile[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    // If we already have cached data, show it instantly and refresh in background
    getAllUsers().then((fresh) => {
      setCached(CACHE_KEY, fresh);
      setUsers(fresh);
      setLoading(false);
    });
  }, []);

  return { users, loading };
}
