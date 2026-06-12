import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { DayEntry } from '../lib/types';
import { getDayEntry, updateDayEntry, updateStreakOnProfile, defaultDayEntry } from '../lib/firestore';
import { getCached, setCached, getSessionCached, setSessionCached } from '../lib/cache';
import { format } from 'date-fns';

export function useDayData(uid: string | null, challengeStartDate: string | null, isOwn = true) {
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
    if (!uid) return;

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

    getDayEntry(uid, today).then((entry) => {
      if (cancelled) return;

      const resolved: DayEntry = entry ?? {
        ...defaultDayEntry(uid, today, challengeStartDate),
        updatedAt: Timestamp.now(),
      };

      // Only cache if the document actually exists in Firestore
      if (entry) {
        if (cacheKey) setCached(cacheKey, entry);
        if (sessionKey) setSessionCached(sessionKey, entry);
      }

      setDayEntry(resolved);
      setLoading(false);
      prevAllCore.current = resolved.allCoreCompleted;

      stopSnapshot = onSnapshot(
        doc(getFirebaseDb(), 'days', uid, 'entries', today),
        (snap) => {
          if (cancelled) return;
          if (!snap.exists()) return; // document deleted or not yet created — keep in-memory default
          const data = snap.data() as DayEntry;
          if (cacheKey) setCached(cacheKey, data);
          if (sessionKey) setSessionCached(sessionKey, data);
          setDayEntry(data);

          if (isOwn && prevAllCore.current !== data.allCoreCompleted) {
            prevAllCore.current = data.allCoreCompleted;
            updateStreakOnProfile(uid, challengeStartDate).catch(() => {});
          }
        },
        (err) => {
          if (err.code !== 'permission-denied') console.error(err);
        }
      );
      if (cancelled) { stopSnapshot(); stopSnapshot = undefined; }
    }).catch(() => {
      if (!cancelled) {
        if (!getCached<DayEntry>(cacheKey ?? '')) {
          setDayEntry({
            ...defaultDayEntry(uid, today, challengeStartDate),
            updatedAt: Timestamp.now(),
          });
        }
        setLoading(false);
      }
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

  // Optimistically patch local state immediately (before Firestore confirms).
  // Snapshot arrival will overwrite with the canonical value.
  const optimisticPatch = useCallback((patch: Partial<DayEntry>) => {
    setDayEntry((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  return { dayEntry, loading, update, optimisticPatch };
}
