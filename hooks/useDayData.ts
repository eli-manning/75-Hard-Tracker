import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { DayEntry } from '../lib/types';
import { getOrCreateDayEntry, updateDayEntry, updateStreakOnProfile } from '../lib/firestore';
import { getCached, setCached, getSessionCached, setSessionCached } from '../lib/cache';
import { format } from 'date-fns';

export function useDayData(uid: string | null, challengeStartDate: string | null) {
  // Tick increments when the app returns to foreground so today is recomputed
  // and the effect re-runs if the date has changed (e.g. open past midnight).
  const [_tick, setTick] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const cacheKey = uid ? `day-${uid}-${today}` : null;
  const sessionKey = uid ? `crewday-day-${uid}-${today}` : null;

  const cached = cacheKey ? (getCached<DayEntry>(cacheKey) ?? getSessionCached<DayEntry>(sessionKey!)) : null;
  const [dayEntry, setDayEntry] = useState<DayEntry | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const prevAllCore = useRef<boolean | null>(null);
  const activeUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !challengeStartDate) return;

    activeUid.current = uid;

    const existing = cacheKey ? getCached<DayEntry>(cacheKey) : null;
    if (existing) {
      setDayEntry(existing);
      setLoading(false);
      prevAllCore.current = existing.allCoreCompleted;
    } else {
      setDayEntry(null);
      setLoading(true);
    }

    let cancelled = false;
    let stopSnapshot: (() => void) | undefined;

    getOrCreateDayEntry(uid, today, challengeStartDate).then((entry) => {
      if (cancelled) return;
      if (cacheKey) setCached(cacheKey, entry);
      if (sessionKey) setSessionCached(sessionKey, entry);
      setDayEntry(entry);
      setLoading(false);
      prevAllCore.current = entry.allCoreCompleted;

      stopSnapshot = onSnapshot(
        doc(getFirebaseDb(), 'days', uid, 'entries', today),
        (snap) => {
          if (!snap.exists() || cancelled) return;
          const data = snap.data() as DayEntry;
          if (cacheKey) setCached(cacheKey, data);
          if (sessionKey) setSessionCached(sessionKey, data);
          setDayEntry(data);

          if (prevAllCore.current !== data.allCoreCompleted) {
            prevAllCore.current = data.allCoreCompleted;
            updateStreakOnProfile(uid).catch(() => {});
          }
        },
        (err) => {
          if (err.code !== 'permission-denied') console.error(err);
        }
      );
      // If cleanup ran before the snapshot was set up, unsubscribe immediately.
      if (cancelled) { stopSnapshot(); stopSnapshot = undefined; }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      stopSnapshot?.();
    };
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
