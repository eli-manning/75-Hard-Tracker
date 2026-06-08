import { View, Text } from 'react-native';
import { colors, fonts } from '../lib/theme';

interface StreakBadgeProps {
  streak: number;
}

const GOLD = '#f0c040';

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;

  const label = streak >= 75 ? '75 COMPLETE' : `${streak} DAY STREAK`;

  let bg: string;
  let border: string;
  let textColor: string;
  let glowColor: string;
  let glowRadius: number;

  if (streak >= 75) {
    bg = GOLD; border = GOLD; textColor = '#0a0800'; glowColor = GOLD; glowRadius = 20;
  } else if (streak >= 50) {
    bg = GOLD; border = GOLD; textColor = '#0a0800'; glowColor = GOLD; glowRadius = 16;
  } else if (streak >= 25) {
    bg = GOLD; border = GOLD; textColor = '#0a0800'; glowColor = GOLD; glowRadius = 12;
  } else if (streak >= 10) {
    bg = colors.accent; border = colors.accent; textColor = colors.white; glowColor = colors.accent; glowRadius = 10;
  } else {
    bg = colors.accent; border = colors.accent; textColor = colors.white; glowColor = colors.accent; glowRadius = 6;
  }

  return (
    <View style={{
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: bg,
      borderWidth: 2,
      borderColor: border,
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: glowRadius,
      elevation: 4,
    }}>
      <Text style={{ fontFamily: fonts.pixel, fontSize: 7, color: textColor, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}
