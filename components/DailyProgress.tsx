import { View, Text, StyleSheet } from 'react-native';
import { DayEntry } from '../lib/types';
import { colors, fonts } from '../lib/theme';

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
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, allDone && styles.labelDone]}>
          {done}/{total} CORE TASKS
        </Text>
        {allDone && (
          <Text style={styles.complete}>COMPLETE ✓</Text>
        )}
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` as any },
            allDone ? styles.fillDone : styles.fillAccent,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.textMuted,
  },
  labelDone: {
    color: colors.green,
  },
  complete: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.green,
    textShadowColor: 'rgba(78, 203, 106, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  track: {
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  fill: {
    height: '100%',
  },
  fillAccent: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  fillDone: {
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
});
