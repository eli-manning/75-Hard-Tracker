import { useEffect, useState } from 'react';
import { UserProfile } from '../lib/types';
import { getAllUsers } from '../lib/firestore';
import { getCached } from '../lib/cache';

export function useAllUsers() {
  const [users, setUsers] = useState<UserProfile[]>(() => getCached<UserProfile[]>('all-users') ?? []);
  const [loading, setLoading] = useState(users.length === 0);

  useEffect(() => {
    getAllUsers()
      .then((u) => { setUsers(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { users, loading };
}
