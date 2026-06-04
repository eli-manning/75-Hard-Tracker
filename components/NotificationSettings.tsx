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

function ToggleSwitch({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  if (Platform.OS !== 'web') {
    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.accent : colors.textMuted}
        trackColor={{ false: colors.border, true: colors.accentLight }}
        disabled={disabled}
      />
    );
  }
  return (
    <button
      onClick={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={{
        width: 44,
        height: 24,
        borderRadius: 0,
        border: `2px solid ${value ? colors.accent : colors.border}`,
        backgroundColor: value ? colors.accentLight : colors.surface2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        padding: 0,
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
      } as React.CSSProperties}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: value ? 20 : 2,
        width: 16,
        height: 16,
        backgroundColor: value ? colors.accent : colors.textMuted,
        transition: 'left 0.15s',
      }} />
    </button>
  );
}

export function NotificationSettings({ profile, onUpdate }: Props) {
  const { requestPermission, clearTokens, webTokenError } = useNotifications(profile.uid);

  const [allEnabled, setAllEnabled] = useState(profile.notifAllEnabled ?? false);
  const [daily, setDaily] = useState(profile.notifDailyEnabled ?? false);
  const [time, setTime] = useState(profile.notifDailyTime ?? '08:00');
  const [nudges, setNudges] = useState(profile.notifNudgesEnabled ?? true);
  const [friendReqs, setFriendReqs] = useState(profile.notifFriendRequestsEnabled ?? true);
  const [saving, setSaving] = useState(false);

  const { hour, minute } = parseTime(time);

  async function scheduleDaily(hhmm: string) {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    const [h, m] = hhmm.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: '75 HARD', body: "Don't forget to log today's tasks. Keep the streak alive.", sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: h, minute: m, repeats: true },
    });
  }

  async function save(patch: Partial<UserProfile>) {
    setSaving(true);
    await onUpdate(patch);
    setSaving(false);
  }

  async function handleAllToggle(val: boolean) {
    if (val) {
      const granted = await requestPermission();
      if (!granted) return;
      if (daily) await scheduleDaily(time);
    } else {
      if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
      await clearTokens();
    }
    setAllEnabled(val);
    await save({ notifAllEnabled: val });
  }

  async function handleDailyToggle(val: boolean) {
    if (val) await scheduleDaily(time);
    else if (Platform.OS !== 'web') await Notifications.cancelAllScheduledNotificationsAsync();
    setDaily(val);
    await save({ notifDailyEnabled: val });
  }

  async function handleTimeChange(hhmm: string) {
    setTime(hhmm);
    if (daily && allEnabled) await scheduleDaily(hhmm);
    await save({ notifDailyTime: hhmm });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

      <Row label="ALL NOTIFICATIONS" value={allEnabled} onToggle={handleAllToggle} disabled={saving} />
      {webTokenError && (
        <Text style={styles.errorText}>⚠ {webTokenError}</Text>
      )}

      {allEnabled && (
        <View style={styles.subSection}>
          <View style={styles.divider} />

          <Row
            label="DAILY REMINDER"
            sub={daily ? formatTime(hour, minute) : undefined}
            value={daily}
            onToggle={handleDailyToggle}
            disabled={saving}
          />

          {daily && Platform.OS !== 'web' && (
            <NativeTimePicker time={time} onChange={handleTimeChange} />
          )}
          {daily && Platform.OS === 'web' && (
            <input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              style={{
                backgroundColor: colors.surface2,
                color: colors.text,
                border: `2px solid ${colors.border}`,
                padding: '6px 10px',
                fontFamily: 'monospace',
                fontSize: 13,
                width: 120,
                outline: 'none',
              } as React.CSSProperties}
            />
          )}

          <View style={styles.divider} />
          <Row label="NUDGES FROM FRIENDS" value={nudges} onToggle={async (v) => { setNudges(v); await save({ notifNudgesEnabled: v }); }} disabled={saving} />

          <View style={styles.divider} />
          <Row label="FRIEND REQUEST ALERTS" value={friendReqs} onToggle={async (v) => { setFriendReqs(v); await save({ notifFriendRequestsEnabled: v }); }} disabled={saving} />
        </View>
      )}
    </View>
  );
}

function Row({ label, sub, value, onToggle, disabled }: { label: string; sub?: string; value: boolean; onToggle: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.subLabel}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <ToggleSwitch value={value} onValueChange={onToggle} disabled={disabled} />
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
    padding: 16, gap: 12,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  sectionTitle: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  errorText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.red },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  sub: { fontFamily: fonts.vt323, fontSize: 18, color: colors.text, marginTop: 2 },
  subSection: { gap: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  colon: { fontFamily: fonts.vt323, fontSize: 32, color: colors.text },
  ampm: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted, marginLeft: 4 },
  stepper: { alignItems: 'center', gap: 4 },
  stepBtn: { padding: 6 },
  stepArrow: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  stepValue: { fontFamily: fonts.vt323, fontSize: 32, color: colors.text, minWidth: 40, textAlign: 'center' },
});
