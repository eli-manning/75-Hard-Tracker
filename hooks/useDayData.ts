'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { DayEntry } from '@/lib/types';
import { getOrCreateDayEntry, updateDayEntry } from '@/lib/firestore';
import { format } from 'date-fns';

export function useDayData(uid: string | null, challengeStartDate: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dayEntry, setDayEntry] = useState<DayEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !challengeStartDate) return;

    let unsub: (() => void) | undefined;

    getOrCreateDayEntry(uid, today, challengeStartDate).then((entry) => {
      setDayEntry(entry);
      setLoading(false);

      unsub = onSnapshot(
        doc(getFirebaseDb(), 'days', uid, 'entries', today),
        (snap) => {
          if (snap.exists()) setDayEntry(snap.data() as DayEntry);
        }
      );
    });

    return () => unsub?.();
  }, [uid, challengeStartDate, today]);

  const update = useCallback(
    async (updates: Partial<DayEntry>) => {
      if (!uid) return;
      await updateDayEntry(uid, today, updates);
    },
    [uid, today]
  );

  return { dayEntry, loading, update };
}
