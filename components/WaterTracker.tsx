import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, shadows } from '../lib/theme';

interface WaterTrackerProps {
  ozLogged: number;
  goal?: number;
  readOnly: boolean;
  onAdd: (oz: number) => void;
  onSetCustom: (oz: number) => void;
}

export function WaterTracker({ ozLogged, goal = 128, readOnly, onAdd, onSetCustom }: WaterTrackerProps) {
  const pct = Math.min(100, (ozLogged / goal) * 100);
  const done = ozLogged >= goal;

  const barColor = done ? colors.green : pct > 60 ? '#3b9ede' : '#1e6ea8';
  const barGlowColor = done ? colors.green : '#3b9ede';

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.barRow}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%` as any, backgroundColor: barColor },
              pct > 0 && { shadowColor: barGlowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 },
            ]}
          />
        </View>
        <Text style={[styles.ozLabel, done && styles.ozLabelDone]}>
          {ozLogged}/{goal}oz
        </Text>
      </View>

      {!readOnly && (
        <View style={styles.btnRow}>
          <Text style={styles.plus}>+</Text>
          {[8, 16, 32].map((oz) => (
            <TouchableOpacity key={oz} onPress={() => onAdd(oz)} style={styles.btn}>
              <Text style={styles.btnText}>{oz}oz</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => onSetCustom(0)}
            disabled={ozLogged <= 0}
            style={[styles.btn, ozLogged <= 0 && styles.btnDisabled]}
          >
            <Text style={[styles.btnText, styles.btnTextMuted]}>RESET</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  barFill: {
    height: '100%',
  },
  ozLabel: {
    fontFamily: fonts.vt323,
    fontSize: 18,
    color: colors.textMuted,
    minWidth: 72,
    textAlign: 'right',
  },
  ozLabelDone: {
    color: colors.green,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  plus: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
  },
  btn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    ...shadows.pixel,
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.text,
  },
  btnTextMuted: {
    color: colors.textMuted,
  },
});
