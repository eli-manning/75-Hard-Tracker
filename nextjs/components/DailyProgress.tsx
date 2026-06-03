'use client';

import { DayEntry } from '@/lib/types';

interface DailyProgressProps {
  entry: DayEntry;
}

function countCompleted(entry: DayEntry): number {
  let n = 0;
  if (entry.workoutOneCompleted) n++;
  if (entry.workoutTwoCompleted && entry.workoutTwoOutdoor) n++;
  if (entry.dietCompleted) n++;
  if (entry.waterCompleted) n++;
  if (entry.readingCompleted) n++;
  if (entry.photoCompleted) n++;
  return n;
}

export function DailyProgress({ entry }: DailyProgressProps) {
  const total = 6;
  const done = countCompleted(entry);
  const pct = (done / total) * 100;
  const allDone = done === total;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '7px',
            color: allDone ? 'var(--green)' : 'var(--text-muted)',
          }}
        >
          {done}/{total} CORE TASKS
        </span>
        {allDone && (
          <span
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '7px',
              color: 'var(--green)',
              textShadow: '0 0 8px var(--green)',
            }}
          >
            COMPLETE ✓
          </span>
        )}
      </div>
      <div
        className="h-5"
        style={{ border: '2px solid var(--border)', background: 'var(--bg)' }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: allDone ? 'var(--green)' : 'var(--accent)',
            boxShadow: allDone ? 'var(--glow-green)' : pct > 0 ? 'var(--glow-accent)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
