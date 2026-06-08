import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { UserProfile } from '../lib/types';
import { getAllUsers } from '../lib/firestore';
import { getCached, invalidate } from '../lib/cache';

export function useAllUsers() {
  const [users, setUsers] = useState<UserProfile[]>(() => getCached<UserProfile[]>('all-users') ?? []);
  const [loading, setLoading] = useState(users.length === 0);

  useEffect(() => {
    getAllUsers()
      .then((u) => { setUsers(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Re-fetch when screen comes into focus in case cache was invalidated by a profile save
  useFocusEffect(
    useCallback(() => {
      const cached = getCached<UserProfile[]>('all-users');
      if (cached) { setUsers(cached); return; }
      invalidate('all-users');
      getAllUsers()
        .then((u) => setUsers(u))
        .catch(() => {});
    }, [])
  );

  return { users, loading };
}
