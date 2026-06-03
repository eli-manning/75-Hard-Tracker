'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * If loading flips to true, hold it at true for at least `minMs` milliseconds.
 * Prevents flash-of-loading-screen when data arrives very quickly.
 * If loading was never true, this returns false immediately.
 */
export function useMinDuration(loading: boolean, minMs = 600): boolean {
  // Initialize from `loading` so the first render already shows the loader when needed —
  // starting at false causes a one-frame black flash before the useEffect fires.
  const [visible, setVisible] = useState(loading);
  const startedAt = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading && !visible) {
      startedAt.current = Date.now();
      setVisible(true);
    } else if (!loading && visible) {
      const elapsed = Date.now() - (startedAt.current ?? 0);
      const remaining = Math.max(0, minMs - elapsed);
      timer.current = setTimeout(() => setVisible(false), remaining);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [loading, visible, minMs]);

  return visible;
}
