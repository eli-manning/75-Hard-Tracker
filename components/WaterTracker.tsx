import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts, shadows } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

interface WaterTrackerProps {
  ozLogged: number;
  goal?: number;
  readOnly: boolean;
  onAdd: (oz: number) => void;
  onSetCustom: (oz: number) => void;
}

export function WaterTracker({ ozLogged, goal = 128, readOnly, onAdd, onSetCustom }: WaterTrackerProps) {
  const { theme } = useTheme();
  const pct = Math.min(100, (ozLogged / goal) * 100);
  const done = ozLogged >= goal;

  const barColor = done ? theme.green : pct > 60 ? '#3b9ede' : '#1e6ea8';
  const barGlowColor = done ? theme.green : '#3b9ede';

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        <View style={[styles.barTrack, { borderColor: theme.border, backgroundColor: theme.bg }]}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%` as any, backgroundColor: barColor },
              pct > 0 && { shadowColor: barGlowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 },
            ]}
          />
        </View>
        <Text style={[styles.ozLabel, { color: done ? theme.green : theme.textMuted }]}>
          {ozLogged}/{goal}oz
        </Text>
      </View>

      {!readOnly && (
        <View style={styles.btnRow}>
          <Text style={[styles.plus, { color: theme.textMuted }]}>+</Text>
          {[8, 16, 32].map((oz) => (
            <TouchableOpacity
              key={oz}
              onPress={() => onAdd(oz)}
              style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>{oz}oz</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => onSetCustom(0)}
            disabled={ozLogged <= 0}
            style={[styles.btn, { borderColor: theme.border, backgroundColor: theme.surface2 }, ozLogged <= 0 && styles.btnDisabled]}
          >
            <Text style={[styles.btnText, { color: theme.textMuted }]}>RESET</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 16, borderWidth: 2 },
  barFill: { height: '100%' },
  ozLabel: { fontFamily: fonts.vt323, fontSize: 18, minWidth: 72, textAlign: 'right' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  plus: { fontFamily: fonts.pixel, fontSize: 6 },
  btn: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, ...shadows.pixel },
  btnDisabled: { opacity: 0.3 },
  btnText: { fontFamily: fonts.pixel, fontSize: 7 },
});
