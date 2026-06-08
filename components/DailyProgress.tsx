import { View, Text, StyleSheet } from 'react-native';
import { DayEntry } from '../lib/types';
import { fonts } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const total = 6;
  const done = countCompleted(entry);
  const pct = (done / total) * 100;
  const allDone = done === total;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: allDone ? theme.green : theme.textMuted }]}>
          {done}/{total} CORE TASKS
        </Text>
        {allDone && (
          <Text style={[styles.complete, { color: theme.green }]}>COMPLETE ✓</Text>
        )}
      </View>
      <View style={[styles.track, { borderColor: theme.border, backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` as any },
            allDone
              ? { backgroundColor: theme.green, shadowColor: theme.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 }
              : { backgroundColor: theme.accent, shadowColor: theme.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.pixel, fontSize: 7 },
  complete: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    textShadowColor: 'rgba(78, 203, 106, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  track: { height: 20, borderWidth: 2 },
  fill: { height: '100%' },
});
