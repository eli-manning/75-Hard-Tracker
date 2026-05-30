'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isToday, isFuture } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsers } from '@/hooks/useAllUsers';
import { getDayHistory, getUserProfile } from '@/lib/firestore';
import { DayEntry, UserProfile } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function tileColor(entry: DayEntry | undefined, date: Date, startDate: string | null): string {
  if (isFuture(date) && !isToday(date)) return 'var(--surface)';
  if (isToday(date) && (!entry || !entry.allCoreCompleted)) return 'var(--accent-light)';
  // Before the challenge started — just show as empty
  if (!entry && startDate && format(date, 'yyyy-MM-dd') < startDate) return 'var(--surface)';
  if (!entry) return 'var(--red-light)';
  if (entry.allCoreCompleted) return 'var(--green-light)';
  const done = [
    entry.workoutOneCompleted,
    entry.workoutTwoCompleted && entry.workoutTwoOutdoor,
    entry.dietCompleted,
    entry.waterCompleted,
    entry.readingCompleted,
    entry.photoCompleted,
  ].filter(Boolean).length;
  if (done === 0) return isToday(date) ? 'var(--accent-light)' : 'var(--red-light)';
  return 'var(--yellow-light)';
}

function tileBorder(entry: DayEntry | undefined, date: Date, startDate: string | null): string {
  if (isFuture(date) && !isToday(date)) return 'var(--border)';
  if (isToday(date) && (!entry || !entry.allCoreCompleted)) return 'var(--accent)';
  if (!entry && startDate && format(date, 'yyyy-MM-dd') < startDate) return 'var(--border)';
  if (!entry) return 'var(--red)';
  if (entry.allCoreCompleted) return 'var(--green)';
  const done = [
    entry.workoutOneCompleted,
    entry.workoutTwoCompleted && entry.workoutTwoOutdoor,
    entry.dietCompleted,
    entry.waterCompleted,
    entry.readingCompleted,
    entry.photoCompleted,
  ].filter(Boolean).length;
  if (done === 0) return isToday(date) ? 'var(--accent)' : 'var(--red)';
  return 'var(--yellow)';
}

function computeStreak(history: DayEntry[]): { current: number; longest: number } {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const today = format(new Date(), 'yyyy-MM-dd');

  let current = 0;
  let longest = 0;
  let streak = 0;
  let expected = today;

  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (entry.date < expected) {
      if (current === 0) current = streak;
      longest = Math.max(longest, streak);
      streak = 0;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = format(d, 'yyyy-MM-dd');
      if (entry.date < expected) break;
    }
    if (!entry.allCoreCompleted) {
      if (entry.date === today) {
        if (current === 0) current = streak;
      } else {
        if (current === 0) current = streak;
        longest = Math.max(longest, streak);
        streak = 0;
      }
      const d = new Date(entry.date);
      d.setDate(d.getDate() - 1);
      expected = format(d, 'yyyy-MM-dd');
      continue;
    }
    streak++;
    longest = Math.max(longest, streak);
    const d = new Date(entry.date);
    d.setDate(d.getDate() - 1);
    expected = format(d, 'yyyy-MM-dd');
  }
  if (current === 0) current = streak;
  longest = Math.max(longest, streak);
  return { current, longest };
}

function HistoryInner({ currentUser }: { currentUser: UserProfile }) {
  const { users } = useAllUsers();
  const [viewUid, setViewUid] = useState(currentUser.uid);
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [month, setMonth] = useState(new Date());

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

  useEffect(() => {
    getDayHistory(viewUid, 120).then(setHistory);
  }, [viewUid]);

  const entryMap = new Map(history.map((e) => [e.date, e]));

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0 = Sunday

  const completed = history.filter((e) => e.allCoreCompleted).length;
  const total = history.filter((e) => !isFuture(parseISO(e.date))).length;
  // Use stored values from profile for instant display; fall back to computed if not set
  const viewProfile = users.find((u) => u.uid === viewUid);
  const currentStreak = viewProfile?.currentStreak ?? computeStreak(history).current;
  const longest = viewProfile?.longestStreak ?? computeStreak(history).longest;
  // Only show red for days after the challenge started and before today
  const startDate = viewProfile?.challengeStartDate ?? null;

  const viewUser = users.find((u) => u.uid === viewUid);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ ...pixelFont, fontSize: '14px', color: 'var(--accent)' }}>HISTORY</h1>
      </div>

      {/* User switcher */}
      {users.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {users.map((u) => (
            <button
              key={u.uid}
              onClick={() => setViewUid(u.uid)}
              style={{
                ...pixelFont,
                fontSize: '8px',
                padding: '6px 12px',
                border: '2px solid var(--text)',
                boxShadow: viewUid === u.uid ? '2px 2px 0 var(--text)' : '1px 1px 0 var(--text)',
                background: viewUid === u.uid ? 'var(--accent)' : 'var(--surface)',
                color: viewUid === u.uid ? '#fff' : 'var(--text)',
                whiteSpace: 'nowrap',
              }}
            >
              {u.displayName.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {viewUser && viewUid !== currentUser.uid && (
        <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)', marginBottom: 16 }}>
          VIEWING {viewUser.displayName.toUpperCase()}&apos;S HISTORY
        </p>
      )}

      {/* Calendar */}
      <div
        className="p-4 mb-6"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--text)',
          boxShadow: '3px 3px 0 var(--text)',
        }}
      >
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
            className="p-1"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ ...pixelFont, fontSize: '9px' }}>
            {format(month, 'MMM yyyy').toUpperCase()}
          </span>
          <button
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
            className="p-1"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center" style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day tiles */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const entry = entryMap.get(dateStr);
            const bg = tileColor(entry, day, startDate);
            const border = tileBorder(entry, day, startDate);
            return (
              <div
                key={dateStr}
                className="aspect-square flex items-center justify-center"
                style={{
                  background: bg,
                  border: `2px solid ${border}`,
                  fontSize: '9px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { color: 'var(--green-light)', border: 'var(--green)', label: 'Done' },
            { color: 'var(--yellow-light)', border: 'var(--yellow)', label: 'Partial' },
            { color: 'var(--red-light)', border: 'var(--red)', label: 'Missed' },
          ].map(({ color, border, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div style={{ width: 12, height: 12, background: color, border: `2px solid ${border}` }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'CURRENT STREAK', value: `${currentStreak} DAYS` },
          { label: 'LONGEST STREAK', value: `${longest} DAYS` },
          { label: 'DAYS COMPLETE', value: String(completed) },
          { label: 'COMPLETION %', value: total > 0 ? `${Math.round((completed / total) * 100)}%` : '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="p-3"
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              boxShadow: '2px 2px 0 var(--border)',
            }}
          >
            <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginBottom: 6 }}>
              {label}
            </p>
            <p style={{ ...pixelFont, fontSize: '12px', color: 'var(--accent)' }}>{value}</p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile);
  }, [user]);

  return (
    <AuthGuard>
      {profile && <HistoryInner currentUser={profile} />}
    </AuthGuard>
  );
}
