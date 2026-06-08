import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { Crew } from '../lib/types';
import { setCached, invalidate } from '../lib/cache';

export function useUserCrews(uid: string | null) {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setCrews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const q = query(
      collection(getFirebaseDb(), 'crews'),
      where('members', 'array-contains', uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as Crew);
      data.forEach((c) => setCached(`crew-${c.id}`, c));
      setCached(`crews-${uid}`, data);
      setCrews(data);
      setLoading(false);
    }, (err) => {
      if (err.code === 'permission-denied') {
        setLoading(false);
        return;
      }
      console.error(err);
      setError('Failed to load crews');
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  // Force a fresh getDocs fetch — use on focus to ensure list is never stale
  const refresh = useCallback(async () => {
    if (!uid) return;
    invalidate(`crews-${uid}`);
    try {
      const q = query(
        collection(getFirebaseDb(), 'crews'),
        where('members', 'array-contains', uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => d.data() as Crew);
      data.forEach((c) => setCached(`crew-${c.id}`, c));
      setCached(`crews-${uid}`, data);
      setCrews(data);
    } catch (err: any) {
      if (err.code !== 'permission-denied') console.error(err);
    }
  }, [uid]);

  return { crews, loading, error, refresh };
}
