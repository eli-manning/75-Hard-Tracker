import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import Svg, { Line, Rect, Path, Circle, Text as SvgText } from 'react-native-svg';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  parseISO, isToday, isFuture, subDays,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAllUsers } from '../../hooks/useAllUsers';
import { getDayHistory, getUserProfile } from '../../lib/firestore';
import { DayEntry, UserProfile } from '../../lib/types';
import { getSessionCached } from '../../lib/cache';
import { colors, fonts } from '../../lib/theme';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64; // accounting for padding + card border
const CHART_H = 160;

function tileColor(entry: DayEntry | undefined, date: Date, startDate: string | null): string {
  if (isFuture(date) && !isToday(date)) return colors.surface;
  if (isToday(date) && (!entry || !entry.allCoreCompleted)) return colors.accentLight;
  if (!entry && startDate && format(date, 'yyyy-MM-dd') <= startDate) return colors.surface;
  if (!entry) return colors.redLight;
  if (entry.allCoreCompleted) return colors.greenLight;
  const done = [
    entry.workoutOneCompleted, entry.workoutTwoCompleted && entry.workoutTwoOutdoor,
    entry.dietCompleted, entry.waterCompleted, entry.readingCompleted, entry.photoCompleted,
  ].filter(Boolean).length;
  if (done === 0) return isToday(date) ? colors.accentLight : colors.redLight;
  return colors.yellowLight;
}

function tileBorder(entry: DayEntry | undefined, date: Date, startDate: string | null): string {
  if (isFuture(date) && !isToday(date)) return colors.border;
  if (isToday(date) && (!entry || !entry.allCoreCompleted)) return colors.accent;
  if (!entry && startDate && format(date, 'yyyy-MM-dd') <= startDate) return colors.border;
  if (!entry) return colors.red;
  if (entry.allCoreCompleted) return colors.green;
  const done = [
    entry.workoutOneCompleted, entry.workoutTwoCompleted && entry.workoutTwoOutdoor,
    entry.dietCompleted, entry.waterCompleted, entry.readingCompleted, entry.photoCompleted,
  ].filter(Boolean).length;
  if (done === 0) return isToday(date) ? colors.accent : colors.red;
  return colors.yellow;
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

// ── Simple SVG bar chart ───────────────────────────────────────────────────────

function BarChart({
  data, color, goalY, goalColor, label,
}: {
  data: { x: string; y: number }[];
  color: string;
  goalY?: number;
  goalColor?: string;
  label?: string;
}) {
  if (data.length === 0) return null;
  const maxY = Math.max(...data.map((d) => d.y), goalY ?? 0, 1);
  const barW = Math.max(2, (CHART_W - 30) / data.length - 2);
  const padLeft = 28;
  const padBottom = 20;
  const chartH = CHART_H - padBottom;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <Line
          key={f}
          x1={padLeft}
          y1={chartH * (1 - f)}
          x2={CHART_W}
          y2={chartH * (1 - f)}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      ))}
      {/* Y axis labels */}
      <SvgText x={padLeft - 4} y={chartH} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">0</SvgText>
      <SvgText x={padLeft - 4} y={chartH * 0.5} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{Math.round(maxY / 2)}</SvgText>
      <SvgText x={padLeft - 4} y={8} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{Math.round(maxY)}</SvgText>
      {/* Bars */}
      {data.map((d, i) => {
        const x = padLeft + i * ((CHART_W - padLeft) / data.length) + 1;
        const h = Math.max(1, (d.y / maxY) * chartH);
        return (
          <Rect
            key={i}
            x={x}
            y={chartH - h}
            width={barW}
            height={h}
            fill={color}
          />
        );
      })}
      {/* Goal line */}
      {goalY !== undefined && (
        <Line
          x1={padLeft}
          y1={chartH - (goalY / maxY) * chartH}
          x2={CHART_W}
          y2={chartH - (goalY / maxY) * chartH}
          stroke={goalColor ?? colors.green}
          strokeWidth={1.5}
          strokeDasharray="4,4"
        />
      )}
      {/* X axis labels (first and last) */}
      {data.length > 0 && (
        <>
          <SvgText x={padLeft + 2} y={CHART_H} fill={colors.textMuted} fontSize={8} fontFamily="Inter">{data[0].x}</SvgText>
          <SvgText x={CHART_W - 4} y={CHART_H} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{data[data.length - 1].x}</SvgText>
        </>
      )}
    </Svg>
  );
}

function LineChartSvg({
  datasets, goalY, goalColor,
}: {
  datasets: { data: { x: string; y: number }[]; color: string; dashed?: boolean }[];
  goalY?: number;
  goalColor?: string;
}) {
  const allValues = datasets.flatMap((ds) => ds.data.map((d) => d.y));
  if (allValues.length === 0) return null;
  const maxY = Math.max(...allValues, goalY ?? 0, 1);
  const minY = Math.min(...allValues, 0);
  const range = maxY - minY || 1;
  const padLeft = 28;
  const padBottom = 20;
  const chartH = CHART_H - padBottom;
  const maxLen = Math.max(...datasets.map((ds) => ds.data.length));

  function toPath(data: { x: string; y: number }[]): string {
    if (data.length === 0) return '';
    return data.map((d, i) => {
      const x = padLeft + (i / (maxLen - 1)) * (CHART_W - padLeft);
      const y = chartH - ((d.y - minY) / range) * chartH;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <Line key={f} x1={padLeft} y1={chartH * (1 - f)} x2={CHART_W} y2={chartH * (1 - f)} stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
      ))}
      <SvgText x={padLeft - 4} y={chartH} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{Math.round(minY)}</SvgText>
      <SvgText x={padLeft - 4} y={8} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{Math.round(maxY)}</SvgText>
      {goalY !== undefined && (
        <Line
          x1={padLeft} y1={chartH - ((goalY - minY) / range) * chartH}
          x2={CHART_W} y2={chartH - ((goalY - minY) / range) * chartH}
          stroke={goalColor ?? colors.green} strokeWidth={1.5} strokeDasharray="4,4"
        />
      )}
      {datasets.map((ds, di) => (
        <Path
          key={di}
          d={toPath(ds.data)}
          stroke={ds.color}
          strokeWidth={2}
          fill="none"
          strokeDasharray={ds.dashed ? '4,2' : undefined}
        />
      ))}
      {/* X labels */}
      {datasets[0]?.data.length > 0 && (
        <>
          <SvgText x={padLeft + 2} y={CHART_H} fill={colors.textMuted} fontSize={8} fontFamily="Inter">{datasets[0].data[0].x}</SvgText>
          <SvgText x={CHART_W - 4} y={CHART_H} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{datasets[0].data[datasets[0].data.length - 1].x}</SvgText>
        </>
      )}
    </Svg>
  );
}

function StackedBarChart({ data }: { data: { x: string; w1: number; w2: number }[] }) {
  if (data.length === 0) return null;
  const maxY = Math.max(...data.map((d) => d.w1 + d.w2), 1);
  const barW = Math.max(2, (CHART_W - 30) / data.length - 2);
  const padLeft = 28;
  const padBottom = 20;
  const chartH = CHART_H - padBottom;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <Line key={f} x1={padLeft} y1={chartH * (1 - f)} x2={CHART_W} y2={chartH * (1 - f)} stroke={colors.border} strokeWidth={1} strokeDasharray="3,3" />
      ))}
      {data.map((d, i) => {
        const x = padLeft + i * ((CHART_W - padLeft) / data.length) + 1;
        const h1 = (d.w1 / maxY) * chartH;
        const h2 = (d.w2 / maxY) * chartH;
        return (
          <Fragment key={i}>
            <Rect x={x} y={chartH - h1 - h2} width={barW} height={h1} fill={colors.accent} />
            <Rect x={x} y={chartH - h2} width={barW} height={h2} fill={colors.green} />
          </Fragment>
        );
      })}
      <SvgText x={padLeft - 4} y={chartH} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">0</SvgText>
      <SvgText x={padLeft - 4} y={8} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{Math.round(maxY)}</SvgText>
      {data.length > 0 && (
        <>
          <SvgText x={padLeft + 2} y={CHART_H} fill={colors.textMuted} fontSize={8} fontFamily="Inter">{data[0].x}</SvgText>
          <SvgText x={CHART_W - 4} y={CHART_H} fill={colors.textMuted} fontSize={8} textAnchor="end" fontFamily="Inter">{data[data.length - 1].x}</SvgText>
        </>
      )}
    </Svg>
  );
}

// ── Chart card wrapper ─────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Insights dashboard ─────────────────────────────────────────────────────────

function InsightsDashboard({ history, viewProfile }: { history: DayEntry[]; viewProfile: UserProfile | undefined }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const pastHistory = useMemo(
    () => history.filter((e) => !isFuture(parseISO(e.date)) && e.date !== today),
    [history, today]
  );
  const sorted = useMemo(() => [...pastHistory].sort((a, b) => a.date.localeCompare(b.date)), [pastHistory]);

  const startDate = viewProfile?.challengeStartDate;
  const daysSinceStart = startDate ? Math.floor((Date.now() - parseISO(startDate).getTime()) / 86400000) + 1 : 0;
  const challengeDay = Math.max(0, daysSinceStart);
  const challengePct = Math.min(100, (challengeDay / 75) * 100);
  const completedDays = pastHistory.filter((e) => e.allCoreCompleted).length;

  const last30 = useMemo(() => { const c = format(subDays(new Date(), 30), 'yyyy-MM-dd'); return sorted.filter((e) => e.date >= c); }, [sorted]);
  const last14 = useMemo(() => { const c = format(subDays(new Date(), 14), 'yyyy-MM-dd'); return sorted.filter((e) => e.date >= c); }, [sorted]);

  const waterData = last30.map((e) => ({ x: format(parseISO(e.date), 'M/d'), y: e.waterOzLogged }));
  const workoutData = last14.map((e) => ({
    x: format(parseISO(e.date), 'M/d'),
    w1: e.workoutOneCompleted ? (e.workoutOneDuration || 0) : 0,
    w2: (e.workoutTwoCompleted && e.workoutTwoOutdoor) ? (e.workoutTwoDuration || 0) : 0,
  }));
  const readingData = last30.map((e) => ({ x: format(parseISO(e.date), 'M/d'), y: e.pagesRead }));
  const weightEntries = sorted.filter((e) => e.bodyWeight != null && e.bodyWeight! > 0);
  const weightData = weightEntries.map((e) => ({ x: format(parseISO(e.date), 'M/d'), y: e.bodyWeight! }));
  const weightUnit = viewProfile?.weightUnit ?? 'lbs';
  const startingWeight = viewProfile?.startingWeight;
  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].y : null;
  const weightChange = latestWeight != null && startingWeight != null ? (latestWeight - startingWeight) : null;

  const moodEntries = last30.filter((e) => e.mood != null);
  const moodData = moodEntries.map((e) => ({ x: format(parseISO(e.date), 'M/d'), y: e.mood! }));
  const energyData = moodEntries.map((e) => ({ x: format(parseISO(e.date), 'M/d'), y: e.energyLevel ?? 0 }));

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

  const totalWaterOz = sorted.reduce((s, e) => s + (e.waterOzLogged || 0), 0);
  const totalPages = sorted.reduce((s, e) => s + (e.pagesRead || 0), 0);
  const totalWorkoutMins = sorted.reduce((s, e) => s + (e.workoutOneDuration || 0) + (e.workoutTwoCompleted ? (e.workoutTwoDuration || 0) : 0), 0);
  const totalPhotos = sorted.filter((e) => e.photoCompleted).length;
  const perfectDays = sorted.filter((e) => e.allCoreCompleted).length;
  const avgWorkoutMins = sorted.filter((e) => e.workoutOneCompleted).length > 0
    ? Math.round(sorted.reduce((s, e) => s + (e.workoutOneDuration || 0), 0) / sorted.filter((e) => e.workoutOneCompleted).length)
    : 0;

  const summaryStats = [
    { icon: 'water-outline' as const, label: 'TOTAL WATER', value: `${(totalWaterOz / 128).toFixed(1)}gal` },
    { icon: 'book-outline' as const, label: 'TOTAL PAGES', value: String(totalPages) },
    { icon: 'timer-outline' as const, label: 'WORKOUT MINS', value: String(totalWorkoutMins) },
    { icon: 'camera-outline' as const, label: 'PHOTOS TAKEN', value: String(totalPhotos) },
    { icon: 'trophy-outline' as const, label: 'PERFECT DAYS', value: String(perfectDays) },
    { icon: 'barbell-outline' as const, label: 'AVG WORKOUT', value: `${avgWorkoutMins}min` },
  ];

  if (sorted.length === 0) return null;

  return (
    <View style={styles.insights}>
      {/* Challenge Progress */}
      <ChartCard title="CHALLENGE PROGRESS">
        <View style={styles.progressHeader}>
          <Text style={styles.progressDay}>DAY {challengeDay} / 75</Text>
          <Text style={styles.progressComplete}>{completedDays} COMPLETE</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${challengePct}%` as any }]} />
        </View>
        <View style={styles.progressFooter}>
          <Text style={styles.progressLabel}>DAY 1</Text>
          <Text style={[styles.progressLabel, { color: colors.accent }]}>{Math.round(challengePct)}%</Text>
          <Text style={styles.progressLabel}>DAY 75</Text>
        </View>
      </ChartCard>

      {/* Lifetime stats */}
      <View>
        <Text style={styles.sectionHeader}>LIFETIME STATS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statCards}>
            {summaryStats.map(({ icon, label, value }) => (
              <View key={label} style={styles.statCard}>
                <Ionicons name={icon} size={18} color={colors.textMuted} />
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
            {weightChange != null && (
              <View style={styles.statCard}>
                <Ionicons name="scale-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: weightChange <= 0 ? colors.green : colors.red }]}>
                  {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)}{weightUnit}
                </Text>
                <Text style={styles.statLabel}>WEIGHT CHANGE</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Water chart */}
      {waterData.length >= 2 && (
        <ChartCard title="WATER INTAKE (30 DAYS)">
          <BarChart data={waterData} color={colors.accent} goalY={128} goalColor={colors.green} />
          <Text style={styles.chartGoalLabel}>─ ─ goal: 128oz</Text>
        </ChartCard>
      )}

      {/* Workout chart */}
      {workoutData.length >= 2 && (
        <ChartCard title="WORKOUT MINUTES (14 DAYS)">
          <StackedBarChart data={workoutData} />
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>W1 (Indoor)</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
            <Text style={styles.legendText}>W2 (Outdoor)</Text>
          </View>
        </ChartCard>
      )}

      {/* Reading chart */}
      {readingData.length >= 2 && (
        <ChartCard title="PAGES READ (30 DAYS)">
          <BarChart data={readingData} color={colors.yellow} goalY={10} goalColor={colors.yellow} />
          <Text style={[styles.chartGoalLabel, { color: colors.yellow }]}>─ ─ goal: 10pg</Text>
        </ChartCard>
      )}

      {/* Weight trend */}
      {weightData.length >= 2 && (
        <ChartCard title={`WEIGHT TREND (${weightUnit.toUpperCase()})`}>
          {weightChange != null && (
            <View style={styles.weightChangeRow}>
              <Text style={[styles.weightChangeVal, { color: weightChange <= 0 ? colors.green : colors.red }]}>
                {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} {weightUnit}
              </Text>
              <Text style={styles.progressLabel}>SINCE START</Text>
            </View>
          )}
          <LineChartSvg
            datasets={[{ data: weightData, color: colors.green }]}
            goalY={startingWeight}
            goalColor={colors.textMuted}
          />
        </ChartCard>
      )}

      {/* Mood & energy */}
      {moodData.length >= 2 && (
        <ChartCard title="MOOD & ENERGY (30 DAYS)">
          <LineChartSvg
            datasets={[
              { data: moodData, color: colors.accent },
              { data: energyData.filter((d) => d.y > 0), color: colors.green, dashed: true },
            ]}
          />
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.legendText}>Mood</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
            <Text style={styles.legendText}>Energy</Text>
          </View>
        </ChartCard>
      )}

      {/* Task completion breakdown */}
      {taskBreakdown.length > 0 && (
        <ChartCard title="TASK COMPLETION RATE">
          <View style={styles.breakdown}>
            {taskBreakdown.map(({ name, pct }) => {
              const barColor = pct >= 90 ? '#3a8f52' : pct >= 60 ? colors.yellow : colors.red;
              return (
                <View key={name} style={styles.breakdownRow}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownName}>{name}</Text>
                    <Text style={[styles.breakdownPct, { color: barColor }]}>{pct}%</Text>
                  </View>
                  <View style={styles.breakdownTrack}>
                    <View style={[styles.breakdownFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </ChartCard>
      )}
    </View>
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
  const insets = useSafeAreaInsets();

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
  const { current: currentStreak, longest } = viewProfile
    ? { current: viewProfile.currentStreak ?? 0, longest: viewProfile.longestStreak ?? 0 }
    : computeStreak(history);
  const startDate = viewProfile?.challengeStartDate ?? null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>HISTORY</Text>

        {/* User switcher */}
        {users.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.userSwitcher}>
            {users.map((u) => (
              <TouchableOpacity
                key={u.uid}
                onPress={() => setViewUid(u.uid)}
                style={[styles.userBtn, viewUid === u.uid && styles.userBtnActive]}
              >
                <Text style={[styles.userBtnText, viewUid === u.uid && styles.userBtnTextActive]}>
                  {u.displayName.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {viewProfile && viewUid !== currentUser.uid && (
          <Text style={styles.viewingLabel}>VIEWING {viewProfile.displayName.toUpperCase()}'S HISTORY</Text>
        )}

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{format(month, 'MMM yyyy').toUpperCase()}</Text>
            <TouchableOpacity onPress={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayLabels}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {(() => {
              const allCells: React.ReactNode[] = [];
              for (let i = 0; i < startPad; i++) {
                allCells.push(<View key={`pad-${i}`} style={styles.calendarCell} />);
              }
              days.forEach((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const entry = entryMap.get(dateStr);
                allCells.push(
                  <View
                    key={dateStr}
                    style={[
                      styles.calendarCell,
                      { backgroundColor: tileColor(entry, day, startDate), borderColor: tileBorder(entry, day, startDate) },
                    ]}
                  >
                    <Text style={styles.calendarDayNum}>{day.getDate()}</Text>
                  </View>
                );
              });
              // Pad the last row to always have 7 cells
              const remainder = allCells.length % 7;
              if (remainder !== 0) {
                for (let i = 0; i < 7 - remainder; i++) {
                  allCells.push(<View key={`trail-${i}`} style={styles.calendarCell} />);
                }
              }
              // Render in rows of 7
              const rows: React.ReactNode[] = [];
              for (let r = 0; r < allCells.length; r += 7) {
                rows.push(
                  <View key={r} style={styles.calendarRow}>
                    {allCells.slice(r, r + 7)}
                  </View>
                );
              }
              return rows;
            })()}
          </View>

          <View style={styles.calendarLegend}>
            {[
              { bg: colors.greenLight, border: colors.green, label: 'Done' },
              { bg: colors.yellowLight, border: colors.yellow, label: 'Partial' },
              { bg: colors.redLight, border: colors.red, label: 'Missed' },
            ].map(({ bg, border, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendTile, { backgroundColor: bg, borderColor: border }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'CURRENT STREAK', value: `${currentStreak} DAYS` },
            { label: 'LONGEST STREAK', value: `${longest} DAYS` },
            { label: 'DAYS COMPLETE', value: String(completed) },
            { label: 'COMPLETION %', value: total > 0 ? `${Math.round((completed / total) * 100)}%` : '—' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statBox}>
              <Text style={styles.statBoxLabel}>{label}</Text>
              <Text style={styles.statBoxValue}>{value}</Text>
            </View>
          ))}
        </View>

        <InsightsDashboard history={history} viewProfile={viewProfile} />
      </ScrollView>
    </View>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('75hard-profile'));

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile);
  }, [user]);

  if (!profile) return <LoadingScreen />;
  return <HistoryInner currentUser={profile} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: { fontFamily: fonts.pixel, fontSize: 14, color: colors.accent, marginBottom: 24 },
  userSwitcher: { flexDirection: 'row', gap: 8, marginBottom: 24, paddingRight: 16 },
  userBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  userBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  userBtnText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.text },
  userBtnTextActive: { color: colors.white },
  viewingLabel: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted, marginBottom: 16 },
  calendarCard: {
    padding: 16, marginBottom: 24,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    shadowColor: colors.border, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  calendarNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 4 },
  monthLabel: { fontFamily: fonts.pixel, fontSize: 9, color: colors.text },
  dayLabels: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  calendarGrid: { flexDirection: 'column' },
  calendarRow: { flexDirection: 'row' },
  calendarCell: {
    flex: 1, aspectRatio: 1,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  calendarDayNum: { fontFamily: fonts.inter, fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  calendarLegend: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendTile: { width: 12, height: 12, borderWidth: 2 },
  legendText: { fontFamily: fonts.inter, fontSize: 11, color: colors.textMuted },
  legend: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  legendDot: { width: 10, height: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statBox: {
    flex: 1, minWidth: '45%', padding: 12,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    shadowColor: colors.border, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  statBoxLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, marginBottom: 6 },
  statBoxValue: { fontFamily: fonts.pixel, fontSize: 12, color: colors.accent },
  insights: { gap: 16, marginTop: 8 },
  chartCard: {
    padding: 16,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    shadowColor: colors.border, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  chartTitle: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted, marginBottom: 12 },
  chartGoalLabel: { fontFamily: fonts.inter, fontSize: 10, color: colors.green, marginTop: 4 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressDay: { fontFamily: fonts.vt323, fontSize: 22, color: colors.accent },
  progressComplete: { fontFamily: fonts.vt323, fontSize: 18, color: colors.textMuted },
  progressTrack: {
    height: 24, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%', backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
  },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  sectionHeader: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted, marginBottom: 8 },
  statCards: { flexDirection: 'row', gap: 12 },
  statCard: {
    minWidth: 90, padding: 12,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    shadowColor: colors.border, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
    alignItems: 'center', gap: 4,
  },
  statValue: { fontFamily: fonts.pixel, fontSize: 12, color: colors.accent, textAlign: 'center' },
  statLabel: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, textAlign: 'center', lineHeight: 8 },
  weightChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  weightChangeVal: { fontFamily: fonts.vt323, fontSize: 20 },
  breakdown: { gap: 8 },
  breakdownRow: { gap: 4 },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownName: { fontFamily: fonts.pixel, fontSize: 6, color: colors.text },
  breakdownPct: { fontFamily: fonts.pixel, fontSize: 6 },
  breakdownTrack: { height: 12, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  breakdownFill: { height: '100%' },
});
