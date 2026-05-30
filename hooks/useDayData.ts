'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { DayEntry } from '@/lib/types';
import { getOrCreateDayEntry, updateDayEntry, updateStreakOnProfile } from '@/lib/firestore';
import { getCached, setCached } from '@/lib/cache';
import { format } from 'date-fns';

export function useDayData(uid: string | null, challengeStartDate: string | null) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const cacheKey = uid ? `day-${uid}-${today}` : null;

  const cached = cacheKey ? getCached<DayEntry>(cacheKey) : null;
  const [dayEntry, setDayEntry] = useState<DayEntry | null>(cached);
  // Only show loading if we have no cached data for this uid
  const [loading, setLoading] = useState(!cached);
  const prevAllCore = useRef<boolean | null>(null);
  const activeUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !challengeStartDate) return;

    activeUid.current = uid;

    // If cached, show immediately and don't show loading state
    const existing = cacheKey ? getCached<DayEntry>(cacheKey) : null;
    if (existing) {
      setDayEntry(existing);
      setLoading(false);
      prevAllCore.current = existing.allCoreCompleted;
    } else {
      setLoading(true);
    }

    let unsub: (() => void) | undefined;

    getOrCreateDayEntry(uid, today, challengeStartDate).then((entry) => {
      // Only update if this uid is still active
      if (activeUid.current !== uid) return;
      if (cacheKey) setCached(cacheKey, entry);
      setDayEntry(entry);
      setLoading(false);
      prevAllCore.current = entry.allCoreCompleted;

      unsub = onSnapshot(
        doc(getFirebaseDb(), 'days', uid, 'entries', today),
        (snap) => {
          if (!snap.exists() || activeUid.current !== uid) return;
          const data = snap.data() as DayEntry;
          if (cacheKey) setCached(cacheKey, data);
          setDayEntry(data);

          if (prevAllCore.current !== data.allCoreCompleted) {
            prevAllCore.current = data.allCoreCompleted;
            updateStreakOnProfile(uid).catch(() => {});
          }
        }
      );
    }).catch(() => {
      if (activeUid.current === uid) setLoading(false);
    });

    return () => unsub?.();
  }, [uid, challengeStartDate, today, cacheKey]);

  const update = useCallback(
    async (updates: Partial<DayEntry>) => {
      if (!uid) return;
      await updateDayEntry(uid, today, updates);
    },
    [uid, today]
  );

  return { dayEntry, loading, update };
}
