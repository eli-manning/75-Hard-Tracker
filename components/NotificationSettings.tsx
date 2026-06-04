import { useState } from 'react';
import { View, Text, Switch, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { UserProfile } from '../lib/types';
import { useNotifications } from '../hooks/useNotifications';
import { colors, fonts, shadows } from '../lib/theme';

interface Props {
  profile: UserProfile;
  onUpdate: (patch: Partial<UserProfile>) => Promise<void>;
}

function parseTime(hhmm: string | undefined): { hour: number; minute: number } {
  if (!hhmm) return { hour: 8, minute: 0 };
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h ?? 8, minute: m ?? 0 };
}

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

export function NotificationSettings({ profile, onUpdate }: Props) {
  const { requestPermission } = useNotifications(profile.uid);
  const [enabled, setEnabled] = useState(profile.notifDailyEnabled ?? false);
  const [time, setTime] = useState(profile.notifDailyTime ?? '08:00');
  const [saving, setSaving] = useState(false);

  const { hour, minute } = parseTime(time);

  async function scheduleDaily(hhmm: string) {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    const [h, m] = hhmm.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '75 HARD',
        body: "Don't forget to log today's tasks. Keep the streak alive.",
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: h, minute: m, repeats: true },
    });
  }

  async function handleToggle(val: boolean) {
    if (val) {
      const granted = await requestPermission();
      if (!granted) return;
      await scheduleDaily(time);
    } else {
      if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
    }
    setEnabled(val);
    setSaving(true);
    await onUpdate({ notifDailyEnabled: val });
    setSaving(false);
  }

  async function handleTimeChange(hhmm: string) {
    setTime(hhmm);
    if (enabled) await scheduleDaily(hhmm);
    setSaving(true);
    await onUpdate({ notifDailyTime: hhmm });
    setSaving(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>DAILY REMINDER</Text>
          {enabled && <Text style={styles.sub}>{formatTime(hour, minute)}</Text>}
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          thumbColor={enabled ? colors.accent : colors.textMuted}
          trackColor={{ false: colors.border, true: colors.accentLight }}
          disabled={saving}
        />
      </View>

      {enabled && Platform.OS !== 'web' && (
        <NativeTimePicker time={time} onChange={handleTimeChange} />
      )}

      {enabled && Platform.OS === 'web' && (
        <input
          type="time"
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          style={{
            marginTop: 8,
            backgroundColor: colors.surface2,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            padding: '8px 12px',
            fontFamily: 'monospace',
            fontSize: 14,
            width: '100%',
            boxSizing: 'border-box',
          } as React.CSSProperties}
        />
      )}

      {Platform.OS === 'web' && (
        <Text style={styles.webNote}>Enable to receive nudges and friend alerts.</Text>
      )}
    </View>
  );
}

function NativeTimePicker({ time, onChange }: { time: string; onChange: (t: string) => void }) {
  const { hour, minute } = parseTime(time);

  function adjust(field: 'hour' | 'minute', delta: number) {
    let h = hour;
    let m = minute;
    if (field === 'hour') h = (h + delta + 24) % 24;
    else m = (m + delta + 60) % 60;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  return (
    <View style={styles.timePicker}>
      <Stepper label={String(hour % 12 || 12).padStart(2, '0')} onUp={() => adjust('hour', 1)} onDown={() => adjust('hour', -1)} />
      <Text style={styles.colon}>:</Text>
      <Stepper label={String(minute).padStart(2, '0')} onUp={() => adjust('minute', 5)} onDown={() => adjust('minute', -5)} />
      <Text style={styles.ampm}>{hour >= 12 ? 'PM' : 'AM'}</Text>
    </View>
  );
}

function Stepper({ label, onUp, onDown }: { label: string; onUp: () => void; onDown: () => void }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onUp} style={styles.stepBtn}>
        <Text style={styles.stepArrow}>▲</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{label}</Text>
      <TouchableOpacity onPress={onDown} style={styles.stepBtn}>
        <Text style={styles.stepArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16, gap: 8,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  label: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  sub: { fontFamily: fonts.vt323, fontSize: 18, color: colors.text, marginTop: 4 },
  webNote: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, marginTop: 4 },
  timePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 8,
  },
  colon: { fontFamily: fonts.vt323, fontSize: 32, color: colors.text },
  ampm: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted, marginLeft: 4 },
  stepper: { alignItems: 'center', gap: 4 },
  stepBtn: { padding: 6 },
  stepArrow: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  stepValue: { fontFamily: fonts.vt323, fontSize: 32, color: colors.text, minWidth: 40, textAlign: 'center' },
});
