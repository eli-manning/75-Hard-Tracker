import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, shadows } from '../lib/theme';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{streak} DAY STREAK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
    ...shadows.glowAccent,
  },
  text: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
    letterSpacing: 0.5,
  },
});
