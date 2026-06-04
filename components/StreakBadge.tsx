import { View, Text } from 'react-native';
import { colors, fonts } from '../lib/theme';

interface StreakBadgeProps {
  streak: number;
}

const GOLD = '#f0c040';
const GOLD_BG = '#f0c04022';

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;

  const label = streak >= 75 ? '75 COMPLETE' : `${streak} DAY STREAK`;

  let badgeStyle;
  let textColor;

  if (streak >= 75) {
    // Tier 5: 75+ — gold, maximum glow
    badgeStyle = {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: GOLD_BG,
      borderWidth: 3,
      borderColor: GOLD,
      shadowColor: GOLD,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 20,
    };
    textColor = GOLD;
  } else if (streak >= 50) {
    // Tier 4: 50–74 — bright gold, borderWidth 3, stronger glow
    badgeStyle = {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: GOLD_BG,
      borderWidth: 3,
      borderColor: GOLD,
      shadowColor: GOLD,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
    };
    textColor = GOLD;
  } else if (streak >= 25) {
    // Tier 3: 25–49 — gold color, gold background, gold border, stronger glow
    badgeStyle = {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: GOLD_BG,
      borderWidth: 2,
      borderColor: GOLD,
      shadowColor: GOLD,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 12,
    };
    textColor = GOLD;
  } else if (streak >= 10) {
    // Tier 2: 10–24 — accent color + glow
    badgeStyle = {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 2,
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
    };
    textColor = colors.accent;
  } else {
    // Tier 1: 1–9 — current style, no extra glow
    badgeStyle = {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.accentLight,
      borderWidth: 2,
      borderColor: colors.accent,
    };
    textColor = colors.accent;
  }

  return (
    <View style={badgeStyle}>
      <Text style={{ fontFamily: fonts.pixel, fontSize: 7, color: textColor, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}
