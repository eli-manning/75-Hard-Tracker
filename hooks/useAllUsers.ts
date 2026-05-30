'use client';

import { useEffect, useState } from 'react';
import { getAllUsers } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';

export function useAllUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  return { users, loading };
}
