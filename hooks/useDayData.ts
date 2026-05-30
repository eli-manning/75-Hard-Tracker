'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { DayEntry } from '@/lib/types';
import { getOrCreateDayEntry, updateDayEntry, updateStreakOnProfile } from '@/lib/firestore';
import { format } from 'date-fns';

export function useDayData(uid: string | null, challengeStartDate: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dayEntry, setDayEntry] = useState<DayEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const prevAllCore = useRef<boolean | null>(null);

  useEffect(() => {
    if (!uid || !challengeStartDate) return;
    setLoading(true);
    setDayEntry(null);

    let unsub: (() => void) | undefined;

    getOrCreateDayEntry(uid, today, challengeStartDate).then((entry) => {
      setDayEntry(entry);
      setLoading(false);
      prevAllCore.current = entry.allCoreCompleted;

      unsub = onSnapshot(
        doc(getFirebaseDb(), 'days', uid, 'entries', today),
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as DayEntry;
          setDayEntry(data);

          // Update stored streak whenever allCoreCompleted changes
          if (prevAllCore.current !== data.allCoreCompleted) {
            prevAllCore.current = data.allCoreCompleted;
            updateStreakOnProfile(uid).catch(() => {});
          }
        }
      );
    }).catch(() => setLoading(false));

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
