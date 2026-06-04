import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CustomTask } from '../lib/types';
import { colors, fonts, shadows } from '../lib/theme';

interface CustomTaskItemProps {
  task: CustomTask;
  completed: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNudge?: () => void;
  nudgedAlready?: boolean;
}

export function CustomTaskItem({ task, completed, readOnly, onToggle, onEdit, onDelete, onNudge, nudgedAlready }: CustomTaskItemProps) {
  const card = (
    <View style={[styles.card, completed ? styles.cardDone : styles.cardDefault]}>
      <View style={[styles.checkbox, completed ? styles.checkboxDone : styles.checkboxEmpty]}>
        {completed && (
          <Svg width={12} height={10} viewBox="0 0 12 10" fill="none">
            <Path d="M1 5l3 3 7-7" stroke="#0c0b08" strokeWidth={2.5} strokeLinecap="square" />
          </Svg>
        )}
      </View>

      <Text style={[
        styles.label,
        completed && styles.labelDone,
        completed && styles.labelStrike,
      ]} numberOfLines={2}>
        {task.label}
      </Text>

      {onNudge && (
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

      {!readOnly && (
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

  if (readOnly) return card;

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
      {card}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  label: {
    flex: 1,
    fontFamily: fonts.vt323,
    fontSize: 20,
    color: colors.text,
    letterSpacing: 0.4,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
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
