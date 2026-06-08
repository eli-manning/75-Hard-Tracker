import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CustomTask } from '../lib/types';
import { fonts, shadows } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

interface CustomTaskItemProps {
  task: CustomTask;
  completed: boolean;
  readOnly: boolean;
  hideActions?: boolean;
  progressAmount?: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetProgress?: (amount: number) => void;
  onResetProgress?: () => void;
  onNudge?: () => void;
  nudgedAlready?: boolean;
}

export function CustomTaskItem({
  task, completed, readOnly, hideActions, progressAmount = 0,
  onToggle, onEdit, onDelete, onSetProgress, onResetProgress,
  onNudge, nudgedAlready,
}: CustomTaskItemProps) {
  const { theme } = useTheme();
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalError, setGoalError] = useState(false);

  const isGoalTask = typeof task.goalAmount === 'number' && task.goalAmount > 0;
  const goalAmount = isGoalTask ? task.goalAmount! : 0;
  const fillPct = goalAmount > 0 ? Math.min(100, (progressAmount / goalAmount) * 100) : 0;
  const unitLabel = task.goalUnit ? ` ${task.goalUnit}` : '';

  function handleSet() {
    const n = parseInt(goalInput, 10);
    if (isNaN(n) || n < 0) { setGoalError(true); return; }
    setGoalError(false);
    setGoalInput('');
    onSetProgress?.(n);
  }

  const inputStyle = [styles.goalInput, { borderColor: theme.border, backgroundColor: theme.surface2, color: theme.text }];

  const card = (
    <View style={[
      styles.card,
      completed
        ? { borderColor: theme.green, backgroundColor: theme.greenLight, ...shadows.glowGreen }
        : { borderColor: theme.border, backgroundColor: theme.surface },
    ]}>
      <View style={[
        styles.checkbox,
        completed
          ? { borderColor: theme.green, backgroundColor: theme.green, shadowColor: theme.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 }
          : { borderColor: theme.textMuted, backgroundColor: 'transparent' },
      ]}>
        {completed && (
          <Svg width={12} height={10} viewBox="0 0 12 10" fill="none">
            <Path d="M1 5l3 3 7-7" stroke={theme.bg} strokeWidth={2.5} strokeLinecap="square" />
          </Svg>
        )}
      </View>

      <View style={styles.labelArea}>
        <View style={styles.labelRow}>
          <Text style={[
            styles.label,
            { color: completed ? theme.green : theme.text },
            completed && !isGoalTask && styles.labelStrike,
            completed && { opacity: 0.7 },
          ]} numberOfLines={2}>
            {task.label}
          </Text>
          {task.amount != null && !isGoalTask && (
            <View style={[styles.amountBadge, { borderColor: theme.border, backgroundColor: theme.surface2 }]}>
              <Text style={[styles.amountBadgeText, { color: theme.text }]}>
                {task.amount}{task.unit ? ` ${task.unit.toUpperCase()}` : ''}
              </Text>
            </View>
          )}
          {task.points && !completed && (
            <View style={[styles.pointsBadge, { borderColor: theme.accent, backgroundColor: theme.accentLight }]}>
              <Text style={[styles.pointsBadgeText, { color: theme.accent }]}>+{task.points} PTS</Text>
            </View>
          )}
        </View>

        {isGoalTask && (
          <View style={styles.goalArea}>
            <View style={styles.barRow}>
              <View style={[styles.barTrack, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <View style={[
                  styles.barFill,
                  { width: `${fillPct}%` as any },
                  { backgroundColor: completed ? theme.green : theme.accent },
                ]} />
              </View>
              <Text style={[styles.progressLabel, { color: completed ? theme.green : theme.textMuted }]}>
                {progressAmount}/{goalAmount}{unitLabel}
              </Text>
            </View>
            {!readOnly && (
              <View style={styles.setRow}>
                <TextInput
                  value={goalInput}
                  onChangeText={(t) => { setGoalInput(t.replace(/[^0-9]/g, '')); setGoalError(false); }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  style={[inputStyle, goalError && { borderColor: theme.red }]}
                  maxLength={6}
                  onSubmitEditing={handleSet}
                />
                <TouchableOpacity
                  onPress={handleSet}
                  style={[styles.setBtn, { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
                >
                  <Text style={[styles.setBtnText, { color: theme.accent }]}>SET</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onResetProgress}
                  style={[styles.resetBtn, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
                >
                  <Text style={[styles.resetBtnText, { color: theme.textMuted }]}>RESET</Text>
                </TouchableOpacity>
              </View>
            )}
            {goalError && <Text style={[styles.goalErrorText, { color: theme.red }]}>ENTER A VALID NUMBER</Text>}
          </View>
        )}

        {!readOnly && task.why && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); setWhyExpanded((v) => !v); }}
            style={styles.whyHint}
            activeOpacity={0.7}
          >
            <Text style={[styles.whyHintText, { color: theme.textMuted }]}>{whyExpanded ? 'HIDE WHY' : 'WHY?'}</Text>
          </TouchableOpacity>
        )}
        {whyExpanded && task.why && (
          <Text style={[styles.whyText, { color: theme.textMuted }]}>{task.why}</Text>
        )}
      </View>

      {onNudge && !completed && (
        <TouchableOpacity
          onPress={onNudge}
          disabled={nudgedAlready}
          style={[
            styles.nudgeBtn,
            nudgedAlready
              ? { borderColor: theme.border, backgroundColor: theme.surface2 }
              : { borderColor: theme.accent, backgroundColor: theme.accentLight },
          ]}
        >
          <Text style={[styles.nudgeBtnText, { color: nudgedAlready ? theme.textMuted : theme.accent }]}>
            {nudgedAlready ? 'NUDGED' : 'NUDGE'}
          </Text>
        </TouchableOpacity>
      )}

      {!readOnly && !hideActions && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={14} color={theme.text} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={14} color={theme.red} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (readOnly || isGoalTask) return card;

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
      {card}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderWidth: 2,
    ...shadows.pixel,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  labelArea: { flex: 1, minWidth: 0, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  label: { fontFamily: fonts.vt323, fontSize: 20, letterSpacing: 0.4, flexShrink: 1 },
  amountBadge: { paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, flexShrink: 0 },
  amountBadgeText: { fontFamily: fonts.pixel, fontSize: 5 },
  pointsBadge: { paddingHorizontal: 4, paddingVertical: 2, borderWidth: 1, flexShrink: 0 },
  pointsBadgeText: { fontFamily: fonts.pixel, fontSize: 5 },
  goalArea: { gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 10, borderWidth: 2 },
  barFill: { height: '100%' },
  progressLabel: { fontFamily: fonts.pixel, fontSize: 5, minWidth: 40, textAlign: 'right' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalInput: { width: 56, fontFamily: fonts.pixel, fontSize: 7, borderWidth: 2, paddingHorizontal: 6, paddingVertical: 3 },
  setBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, ...shadows.pixel },
  setBtnText: { fontFamily: fonts.pixel, fontSize: 5 },
  resetBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, ...shadows.pixel },
  resetBtnText: { fontFamily: fonts.pixel, fontSize: 5 },
  goalErrorText: { fontFamily: fonts.pixel, fontSize: 5 },
  whyHint: { marginTop: 2 },
  whyHintText: { fontFamily: fonts.pixel, fontSize: 5 },
  whyText: { fontFamily: fonts.vt323, fontSize: 16, fontStyle: 'italic' },
  labelStrike: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  actionBtn: { padding: 4 },
  nudgeBtn: { paddingHorizontal: 5, paddingVertical: 3, borderWidth: 2, flexShrink: 0 },
  nudgeBtnText: { fontFamily: fonts.pixel, fontSize: 5 },
});
