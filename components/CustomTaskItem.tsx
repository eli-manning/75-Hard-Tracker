import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CustomTask } from '../lib/types';
import { colors, fonts, shadows } from '../lib/theme';

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

  const card = (
    <View style={[styles.card, completed ? styles.cardDone : styles.cardDefault]}>
      <View style={[styles.checkbox, completed ? styles.checkboxDone : styles.checkboxEmpty]}>
        {completed && (
          <Svg width={12} height={10} viewBox="0 0 12 10" fill="none">
            <Path d="M1 5l3 3 7-7" stroke={colors.bg} strokeWidth={2.5} strokeLinecap="square" />
          </Svg>
        )}
      </View>

      <View style={styles.labelArea}>
        <View style={styles.labelRow}>
          <Text style={[
            styles.label,
            completed && styles.labelDone,
            completed && !isGoalTask && styles.labelStrike,
          ]} numberOfLines={2}>
            {task.label}
          </Text>
          {task.amount != null && !isGoalTask && (
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>
                {task.amount}{task.unit ? ` ${task.unit.toUpperCase()}` : ''}
              </Text>
            </View>
          )}
          {task.points && !completed && (
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>+{task.points} PTS</Text>
            </View>
          )}
        </View>

        {isGoalTask && (
          <View style={styles.goalArea}>
            <View style={styles.barRow}>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  { width: `${fillPct}%` as any },
                  completed ? styles.barFillDone : styles.barFillAccent,
                ]} />
              </View>
              <Text style={[styles.progressLabel, completed && styles.progressLabelDone]}>
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
                  placeholderTextColor={colors.textMuted}
                  style={[styles.goalInput, goalError && styles.goalInputError]}
                  maxLength={6}
                  onSubmitEditing={handleSet}
                />
                <TouchableOpacity onPress={handleSet} style={styles.setBtn}>
                  <Text style={styles.setBtnText}>SET</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onResetProgress} style={styles.resetBtn}>
                  <Text style={styles.resetBtnText}>RESET</Text>
                </TouchableOpacity>
              </View>
            )}
            {goalError && <Text style={styles.goalErrorText}>ENTER A VALID NUMBER</Text>}
          </View>
        )}

        {!readOnly && task.why && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); setWhyExpanded((v) => !v); }}
            style={styles.whyHint}
            activeOpacity={0.7}
          >
            <Text style={styles.whyHintText}>{whyExpanded ? 'HIDE WHY' : 'WHY?'}</Text>
          </TouchableOpacity>
        )}
        {whyExpanded && task.why && (
          <Text style={styles.whyText}>{task.why}</Text>
        )}
      </View>

      {onNudge && !completed && (
        <TouchableOpacity
          onPress={onNudge}
          disabled={nudgedAlready}
          style={[styles.nudgeBtn, nudgedAlready && styles.nudgeBtnDone]}
        >
          <Text style={[styles.nudgeBtnText, nudgedAlready && styles.nudgeBtnTextDone]}>
            {nudgedAlready ? 'NUDGED' : 'NUDGE'}
          </Text>
        </TouchableOpacity>
      )}

      {!readOnly && !hideActions && !isGoalTask && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={14} color={colors.text} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={14} color={colors.red} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
        </View>
      )}
      {!readOnly && !hideActions && isGoalTask && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={14} color={colors.text} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={14} color={colors.red} style={{ opacity: 0.3 }} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Goal tasks: card is not tappable (checkbox is visual only)
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
  cardDefault: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardDone: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
    ...shadows.glowGreen,
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
  checkboxEmpty: {
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    borderColor: colors.green,
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  labelArea: { flex: 1, minWidth: 0, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  label: {
    fontFamily: fonts.vt323,
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  amountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    flexShrink: 0,
  },
  amountBadgeText: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    color: colors.text,
  },
  pointsBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    flexShrink: 0,
  },
  pointsBadgeText: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    color: colors.accent,
  },
  goalArea: { gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 10, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  barFill: { height: '100%' },
  barFillAccent: { backgroundColor: colors.accent },
  barFillDone: { backgroundColor: colors.green },
  progressLabel: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, minWidth: 40, textAlign: 'right' },
  progressLabelDone: { color: colors.green },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalInput: {
    width: 56,
    fontFamily: fonts.pixel,
    fontSize: 7,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  goalInputError: { borderColor: colors.red },
  setBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    ...shadows.pixel,
  },
  setBtnText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.accent },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    ...shadows.pixel,
  },
  resetBtnText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },
  goalErrorText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.red },
  whyHint: { marginTop: 2 },
  whyHintText: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    color: colors.textMuted,
  },
  whyText: {
    fontFamily: fonts.vt323,
    fontSize: 16,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  labelDone: {
    color: colors.green,
    opacity: 0.7,
  },
  labelStrike: {
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    padding: 4,
  },
  nudgeBtn: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    flexShrink: 0,
  },
  nudgeBtnDone: {
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  nudgeBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    color: colors.accent,
  },
  nudgeBtnTextDone: {
    color: colors.textMuted,
  },
});
