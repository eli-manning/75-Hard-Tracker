'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, isToday, isFuture, subDays, getDay as getDayOfWeek } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsers } from '@/hooks/useAllUsers';
import { getDayHistory, getUserProfile } from '@/lib/firestore';
import { DayEntry, UserProfile } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { getSessionCached } from '@/lib/cache';
import { ChevronLeft, ChevronRight, Droplets, BookOpen, Timer, Camera, Trophy, Dumbbell, CalendarDays, Scale } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';

function tileColor(entry: DayEntry | undefined, date: Date, startDate: string | null): string {
  if (isFuture(date) && !isToday(date)) return 'var(--surface)';
  if (isToday(date) && (!entry || !entry.allCoreCompleted)) return 'var(--accent-light)';
  if (!entry && startDate && format(date, 'yyyy-MM-dd') <= startDate) return 'var(--surface)';
  if (!entry) return 'var(--red-light)';
  if (entry.allCoreCompleted) return 'var(--green-light)';
  const done = [
    entry.workoutOneCompleted, entry.workoutTwoCompleted && entry.workoutTwoOutdoor,
    entry.dietCompleted, entry.waterCompleted, entry.readingCompleted, entry.photoCompleted,
  ].filter(Boolean).length;
  if (done === 0) return isToday(date) ? 'var(--accent-light)' : 'var(--red-light)';
  return 'var(--yellow-light)';
}

function tileBorder(entry: DayEntry | undefined, date: Date, startDate: string | null): string {
  if (isFuture(date) && !isToday(date)) return 'var(--border)';
  if (isToday(date) && (!entry || !entry.allCoreCompleted)) return 'var(--accent)';
  if (!entry && startDate && format(date, 'yyyy-MM-dd') <= startDate) return 'var(--border)';
  if (!entry) return 'var(--red)';
  if (entry.allCoreCompleted) return 'var(--green)';
  const done = [
    entry.workoutOneCompleted, entry.workoutTwoCompleted && entry.workoutTwoOutdoor,
    entry.dietCompleted, entry.waterCompleted, entry.readingCompleted, entry.photoCompleted,
  ].filter(Boolean).length;
  if (done === 0) return isToday(date) ? 'var(--accent)' : 'var(--red)';
  return 'var(--yellow)';
}

function computeStreak(history: DayEntry[]): { current: number; longest: number } {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const today = format(new Date(), 'yyyy-MM-dd');
  let current = 0, longest = 0, streak = 0;
  const hasTodayComplete = sorted.some((e) => e.date === today && e.allCoreCompleted);
  let expected = hasTodayComplete ? today : format(subDays(new Date(), 1), 'yyyy-MM-dd');
  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (entry.date < expected) {
      if (current === 0) current = streak;
      longest = Math.max(longest, streak);
      streak = 0;
      const d = new Date(expected); d.setDate(d.getDate() - 1);
      expected = format(d, 'yyyy-MM-dd');
      if (entry.date < expected) break;
    }
    if (!entry.allCoreCompleted) {
      if (entry.date === today) { if (current === 0) current = streak; }
      else { if (current === 0) current = streak; longest = Math.max(longest, streak); streak = 0; }
      const d = new Date(entry.date); d.setDate(d.getDate() - 1);
      expected = format(d, 'yyyy-MM-dd');
      continue;
    }
    streak++;
    longest = Math.max(longest, streak);
    const d = new Date(entry.date); d.setDate(d.getDate() - 1);
    expected = format(d, 'yyyy-MM-dd');
  }
  if (current === 0) current = streak;
  longest = Math.max(longest, streak);
  return { current, longest };
}

// ── Chart helpers ──────────────────────────────────────────────────────────────

const chartTooltipStyle = {
  background: 'var(--surface)',
  border: '2px solid var(--border)',
  fontFamily: '"Press Start 2P", monospace',
  fontSize: '8px',
  color: 'var(--text)',
  boxShadow: '2px 2px 0 #000',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color: 'var(--text-muted)', marginBottom: 12 }}>
      {title}
    </p>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 mb-4" style={{ background: 'var(--surface)', border: '2px solid var(--border)', boxShadow: '2px 2px 0 var(--border)' }}>
      <SectionHeader title={title} />
      {children}
    </div>
  );
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ── Insights component ─────────────────────────────────────────────────────────

function InsightsDashboard({ history, viewProfile }: { history: DayEntry[]; viewProfile: UserProfile | undefined }) {
  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  const today = format(new Date(), 'yyyy-MM-dd');
  const pastHistory = useMemo(
    () => history.filter((e) => !isFuture(parseISO(e.date)) && e.date !== today),
    [history, today]
  );
  const sorted = useMemo(() => [...pastHistory].sort((a, b) => a.date.localeCompare(b.date)), [pastHistory]);

  // Challenge progress
  const startDate = viewProfile?.challengeStartDate;
  const daysSinceStart = startDate
    ? Math.floor((Date.now() - parseISO(startDate).getTime()) / 86400000) + 1
    : 0;
  const challengeDay = Math.max(0, daysSinceStart);
  const challengePct = Math.min(100, (challengeDay / 75) * 100);
  const completedDays = pastHistory.filter((e) => e.allCoreCompleted).length;

  // Last 30 days window
  const last30 = useMemo(() => {
    const cutoff = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    return sorted.filter((e) => e.date >= cutoff);
  }, [sorted]);

  // Last 14 days
  const last14 = useMemo(() => {
    const cutoff = format(subDays(new Date(), 14), 'yyyy-MM-dd');
    return sorted.filter((e) => e.date >= cutoff);
  }, [sorted]);

  // Water data
  const waterData = last30.map((e) => ({
    date: format(parseISO(e.date), 'M/d'),
    oz: e.waterOzLogged,
  }));

  // Workout minutes
  const workoutData = last14.map((e) => ({
    date: format(parseISO(e.date), 'M/d'),
    w1: e.workoutOneCompleted ? (e.workoutOneDuration || 0) : 0,
    w2: (e.workoutTwoCompleted && e.workoutTwoOutdoor) ? (e.workoutTwoDuration || 0) : 0,
  }));

  // Reading data
  const readingData = last30.map((e) => ({
    date: format(parseISO(e.date), 'M/d'),
    pages: e.pagesRead,
  }));

  // Weight data
  const weightEntries = sorted.filter((e) => e.bodyWeight != null && e.bodyWeight! > 0);
  const weightData = weightEntries.map((e) => ({
    date: format(parseISO(e.date), 'M/d'),
    weight: e.bodyWeight,
  }));
  const weightUnit = viewProfile?.weightUnit ?? 'lbs';
  const startingWeight = viewProfile?.startingWeight;
  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : null;
  const weightChange = latestWeight != null && startingWeight != null
    ? (latestWeight - startingWeight)
    : null;

  // Mood & energy data
  const moodData = last30.filter((e) => e.mood != null).map((e) => ({
    date: format(parseISO(e.date), 'M/d'),
    mood: e.mood,
    energy: e.energyLevel,
  }));

  // Task breakdown
  const taskBreakdown = useMemo(() => {
    const n = pastHistory.length;
    if (n === 0) return [];
    return [
      { name: 'WORKOUT 1', pct: Math.round((pastHistory.filter((e) => e.workoutOneCompleted).length / n) * 100) },
      { name: 'WORKOUT 2', pct: Math.round((pastHistory.filter((e) => e.workoutTwoCompleted && e.workoutTwoOutdoor).length / n) * 100) },
      { name: 'DIET', pct: Math.round((pastHistory.filter((e) => e.dietCompleted).length / n) * 100) },
      { name: 'WATER', pct: Math.round((pastHistory.filter((e) => e.waterCompleted).length / n) * 100) },
      { name: 'READING', pct: Math.round((pastHistory.filter((e) => e.readingCompleted).length / n) * 100) },
      { name: 'PHOTO', pct: Math.round((pastHistory.filter((e) => e.photoCompleted).length / n) * 100) },
    ].sort((a, b) => b.pct - a.pct);
  }, [pastHistory]);

  // Summary stats
  const totalWaterOz = sorted.reduce((s, e) => s + (e.waterOzLogged || 0), 0);
  const totalGallons = (totalWaterOz / 128).toFixed(1);
  const totalPages = sorted.reduce((s, e) => s + (e.pagesRead || 0), 0);
  const totalWorkoutMins = sorted.reduce((s, e) => s + (e.workoutOneDuration || 0) + (e.workoutTwoCompleted ? (e.workoutTwoDuration || 0) : 0), 0);
  const totalPhotos = sorted.filter((e) => e.photoCompleted).length;
  const perfectDays = sorted.filter((e) => e.allCoreCompleted).length;
  const avgWorkoutMins = sorted.filter((e) => e.workoutOneCompleted).length > 0
    ? Math.round(sorted.reduce((s, e) => s + (e.workoutOneDuration || 0), 0) / sorted.filter((e) => e.workoutOneCompleted).length)
    : 0;

  // Best day of week
  const dayTotals = Array(7).fill(0);
  const dayCounts = Array(7).fill(0);
  sorted.forEach((e) => {
    const d = getDayOfWeek(parseISO(e.date));
    if (e.allCoreCompleted) dayTotals[d]++;
    dayCounts[d]++;
  });
  const bestDayIdx = dayCounts.reduce((best, count, i) => {
    if (count === 0) return best;
    const rate = dayTotals[i] / count;
    return rate > (dayCounts[best] > 0 ? dayTotals[best] / dayCounts[best] : 0) ? i : best;
  }, 0);
  const bestDayLabel = sorted.length > 0 ? DAY_LABELS[bestDayIdx] : '—';

  const summaryCards: { Icon: React.ElementType; label: string; value: string; color?: string }[] = [
    { Icon: Droplets, label: 'TOTAL WATER', value: `${totalGallons}gal` },
    { Icon: BookOpen, label: 'TOTAL PAGES', value: String(totalPages) },
    { Icon: Timer, label: 'WORKOUT MINS', value: String(totalWorkoutMins) },
    { Icon: Camera, label: 'PHOTOS TAKEN', value: String(totalPhotos) },
    { Icon: Trophy, label: 'PERFECT DAYS', value: String(perfectDays) },
    { Icon: Dumbbell, label: 'AVG WORKOUT', value: `${avgWorkoutMins}min` },
    { Icon: CalendarDays, label: 'BEST DAY', value: bestDayLabel },
    ...(weightChange != null ? [{
      Icon: Scale, label: 'WEIGHT CHANGE',
      value: `${weightChange >= 0 ? '+' : ''}${weightChange.toFixed(1)}${weightUnit}`,
      color: weightChange <= 0 ? 'var(--green)' : 'var(--red)',
    }] : []),
  ];

  if (sorted.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      {/* Challenge Progress */}
      <ChartCard title="CHALLENGE PROGRESS">
        <div className="flex items-center justify-between mb-2">
          <span style={{ ...vt323, fontSize: '22px', color: 'var(--accent)' }}>DAY {challengeDay} / 75</span>
          <span style={{ ...vt323, fontSize: '18px', color: 'var(--text-muted)' }}>{completedDays} COMPLETE</span>
        </div>
        <div className="h-6" style={{ border: '2px solid var(--border)', background: 'var(--bg)', position: 'relative' }}>
          <div style={{
            height: '100%', width: `${challengePct}%`,
            background: 'var(--accent)', boxShadow: 'var(--glow-accent)',
            transition: 'width 600ms ease',
          }} />
          {challengeDay >= 75 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{ ...pixelFont, fontSize: '7px', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Trophy size={10} /> COMPLETE!</span>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-1">
          <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>DAY 1</span>
          <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--accent)' }}>{Math.round(challengePct)}%</span>
          <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>DAY 75</span>
        </div>
      </ChartCard>

      {/* Insight summary cards */}
      <div>
        <SectionHeader title="LIFETIME STATS" />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {summaryCards.map(({ Icon, label, value, color }) => (
            <div key={label} className="shrink-0 p-3 text-center" style={{ background: 'var(--surface)', border: '2px solid var(--border)', boxShadow: '2px 2px 0 #000', minWidth: 90 }}>
              <div className="flex justify-center mb-2"><Icon size={18} color="var(--text-muted)" /></div>
              <div style={{ ...pixelFont, fontSize: '12px', color: color ?? 'var(--accent)', marginBottom: 4 }}>{value}</div>
              <div style={{ ...pixelFont, fontSize: '5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Water */}
      {waterData.length >= 2 && (
        <ChartCard title="WATER INTAKE (30 DAYS)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={waterData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}oz`, 'Water']} />
              <ReferenceLine y={128} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'GOAL', position: 'right', fontFamily: '"Press Start 2P"', fontSize: 6, fill: 'var(--green)' }} />
              <Line type="monotone" dataKey="oz" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Workout minutes */}
      {workoutData.length >= 2 && (
        <ChartCard title="WORKOUT MINUTES (14 DAYS)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={workoutData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="w1" name="Workout 1" stackId="a" fill="var(--accent)" />
              <Bar dataKey="w2" name="Workout 2" stackId="a" fill="var(--green)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[{ color: 'var(--accent)', label: 'W1 (Indoor)' }, { color: 'var(--green)', label: 'W2 (Outdoor)' }].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div style={{ width: 10, height: 10, background: color, border: '1px solid var(--border)' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Reading */}
      {readingData.length >= 2 && (
        <ChartCard title="PAGES READ (30 DAYS)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={readingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--yellow)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--yellow)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}pg`, 'Pages']} />
              <ReferenceLine y={10} stroke="var(--yellow)" strokeDasharray="4 4" label={{ value: 'GOAL', position: 'right', fontFamily: '"Press Start 2P"', fontSize: 6, fill: 'var(--yellow)' }} />
              <Area type="monotone" dataKey="pages" stroke="var(--yellow)" fill="url(#readGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Weight trend */}
      {weightData.length >= 2 && (
        <ChartCard title={`WEIGHT TREND (${weightUnit.toUpperCase()})`}>
          {weightChange != null && (
            <div className="flex items-center gap-2 mb-3">
              <span style={{ ...vt323, fontSize: '20px', color: weightChange <= 0 ? 'var(--green)' : 'var(--red)' }}>
                {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} {weightUnit}
              </span>
              <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>SINCE START</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v} ${weightUnit}`, 'Weight']} />
              {startingWeight && (
                <ReferenceLine y={startingWeight} stroke="var(--text-muted)" strokeDasharray="4 4"
                  label={{ value: 'START', position: 'right', fontFamily: '"Press Start 2P"', fontSize: 6, fill: 'var(--text-muted)' }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="var(--green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--green)' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Mood & energy */}
      {moodData.length >= 2 && (
        <ChartCard title="MOOD & ENERGY (30 DAYS)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={moodData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontFamily: 'Inter', fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="mood" name="Mood" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="energy" name="Energy" stroke="var(--green)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[{ color: 'var(--accent)', label: 'Mood', dash: false }, { color: 'var(--green)', label: 'Energy', dash: true }].map(({ color, label, dash }) => (
              <div key={label} className="flex items-center gap-1">
                <div style={{ width: 16, height: 2, background: color, borderTop: dash ? `2px dashed ${color}` : 'none', opacity: 0.9 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Task breakdown */}
      {taskBreakdown.length > 0 && (
        <ChartCard title="TASK COMPLETION RATE">
          <div className="space-y-2">
            {taskBreakdown.map(({ name, pct }) => (
              <div key={name}>
                <div className="flex justify-between mb-1">
                  <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text)' }}>{name}</span>
                  <span style={{ ...pixelFont, fontSize: '6px', color: pct >= 90 ? '#3a8f52' : pct >= 60 ? 'var(--yellow)' : 'var(--red)' }}>{pct}%</span>
                </div>
                <div className="h-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: pct >= 90 ? '#3a8f52' : pct >= 60 ? 'var(--yellow)' : 'var(--red)',
                    transition: 'width 500ms ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ── Main history page ──────────────────────────────────────────────────────────

function HistoryInner({ currentUser }: { currentUser: UserProfile }) {
  const { users: allUsers } = useAllUsers();
  const friendUids = new Set(currentUser.friends ?? []);
  const users = allUsers.filter((u) => u.uid === currentUser.uid || friendUids.has(u.uid));
  const [viewUid, setViewUid] = useState(currentUser.uid);
  const [history, setHistory] = useState<DayEntry[]>([]);
  const [month, setMonth] = useState(new Date());

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

  useEffect(() => {
    setHistory([]);
    getDayHistory(viewUid, 120).then(setHistory);
  }, [viewUid]);

  const entryMap = new Map(history.map((e) => [e.date, e]));
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const completed = history.filter((e) => e.allCoreCompleted).length;
  const total = history.filter((e) => {
    if (e.date === todayStr) return e.allCoreCompleted;
    return !isFuture(parseISO(e.date));
  }).length;

  const viewProfile = users.find((u) => u.uid === viewUid);
  const currentStreak = viewProfile?.currentStreak ?? computeStreak(history).current;
  const longest = viewProfile?.longestStreak ?? computeStreak(history).longest;
  const startDate = viewProfile?.challengeStartDate ?? null;
  const viewUser = users.find((u) => u.uid === viewUid);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="px-4 pt-6 page-enter">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ ...pixelFont, fontSize: '14px', color: 'var(--accent)' }}>HISTORY</h1>
        </div>

        {/* User switcher */}
        {users.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {users.map((u) => (
              <button key={u.uid} onClick={() => setViewUid(u.uid)}
                style={{
                  ...pixelFont, fontSize: '8px', padding: '6px 12px',
                  border: '2px solid var(--border)',
                  boxShadow: viewUid === u.uid ? '2px 2px 0 var(--border)' : 'none',
                  background: viewUid === u.uid ? 'var(--accent)' : 'var(--surface)',
                  color: viewUid === u.uid ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
                }}>
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
        <div className="p-4 mb-6" style={{ background: 'var(--surface)', border: '2px solid var(--border)', boxShadow: '2px 2px 0 var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} className="p-1">
              <ChevronLeft size={16} />
            </button>
            <span style={{ ...pixelFont, fontSize: '9px' }}>{format(month, 'MMM yyyy').toUpperCase()}</span>
            <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} className="p-1">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center" style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const entry = entryMap.get(dateStr);
              return (
                <div key={dateStr} className="aspect-square flex items-center justify-center"
                  style={{ background: tileColor(entry, day, startDate), border: `2px solid ${tileBorder(entry, day, startDate)}`, fontSize: '9px', fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--text)' }}>
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-4 flex-wrap">
            {[{ color: 'var(--green-light)', border: 'var(--green)', label: 'Done' }, { color: 'var(--yellow-light)', border: 'var(--yellow)', label: 'Partial' }, { color: 'var(--red-light)', border: 'var(--red)', label: 'Missed' }].map(({ color, border, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div style={{ width: 12, height: 12, background: color, border: `2px solid ${border}` }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {[
            { label: 'CURRENT STREAK', value: `${currentStreak} DAYS` },
            { label: 'LONGEST STREAK', value: `${longest} DAYS` },
            { label: 'DAYS COMPLETE', value: String(completed) },
            { label: 'COMPLETION %', value: total > 0 ? `${Math.round((completed / total) * 100)}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3" style={{ background: 'var(--surface)', border: '2px solid var(--border)', boxShadow: '2px 2px 0 var(--border)' }}>
              <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
              <p style={{ ...pixelFont, fontSize: '12px', color: 'var(--accent)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Insights dashboard */}
        <InsightsDashboard history={history} viewProfile={viewProfile} />

      </div>
      <BottomNav />
    </div>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('75hard-profile'));

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile);
  }, [user]);

  return (
    <AuthGuard>
      {profile ? <HistoryInner currentUser={profile} /> : <LoadingScreen />}
    </AuthGuard>
  );
}
