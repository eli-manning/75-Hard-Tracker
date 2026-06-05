import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../lib/theme';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'lg';
}

function flameColor(streak: number): string {
  if (streak >= 75) return '#f0c040';
  if (streak >= 50) return '#e83020';
  if (streak >= 25) return '#f06020';
  if (streak >= 10) return '#f0a030';
  if (streak >= 5)  return '#4a90e8';
  return '#6888cc';
}

export function StreakFlame({ streak, size = 'sm' }: StreakFlameProps) {
  if (streak === 0) return null;

  const color = flameColor(streak);
  const iconSize  = size === 'lg' ? 52 : 38;
  const fontSize  = size === 'lg' ? 11 : 9;
  const offset    = size === 'lg' ? -14 : -10;
  // Push the number down into the belly of the flame (top ~50%)
  const numTop    = iconSize * 0.55;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: offset,
        left: offset,
        width: iconSize,
        height: iconSize,
        zIndex: 10,
        ...(Platform.OS === 'web'
          ? { filter: `drop-shadow(0 0 ${size === 'lg' ? 12 : 8}px ${color})` } as any
          : {
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: size === 'lg' ? 12 : 8,
              elevation: 6,
            }),
      }}
    >
      <Ionicons name="flame" size={iconSize} color={color} />
      <Text
        style={{
          position: 'absolute',
          top: numTop,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: fonts.pixel,
          fontSize,
          color: '#ffffff',
          textShadowColor: 'rgba(0,0,0,0.9)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}
      >
        {streak >= 100 ? '99+' : String(streak)}
      </Text>
    </View>
  );
}
