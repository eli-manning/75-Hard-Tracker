import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomTask } from '../lib/types';
import { colors, fonts, shadows } from '../lib/theme';

interface TaskEditorProps {
  task?: CustomTask;
  defaultType?: 'daily' | 'backlog';
  onSave: (task: Partial<CustomTask>) => void;
  onClose: () => void;
}

export function TaskEditor({ task, defaultType = 'daily', onSave, onClose }: TaskEditorProps) {
  const [label, setLabel] = useState(task?.label ?? '');
  const [type, setType] = useState<'daily' | 'backlog'>(task?.type ?? defaultType);
  const [visible, setVisible] = useState(task?.visible ?? true);
  const [why, setWhy] = useState(task?.why ?? '');
  const [points, setPoints] = useState<string>(task?.points ? String(task.points) : '');

  function handleSave() {
    if (!label.trim()) return;
    const parsedPoints = parseInt(points, 10);
    onSave({
      label: label.trim().slice(0, 200),
      type,
      visible,
      why: why.trim() || undefined,
      points: (!isNaN(parsedPoints) && parsedPoints > 0) ? Math.min(parsedPoints, 10) : undefined,
    });
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{task ? 'EDIT TASK' : 'NEW TASK'}</Text>
            <TouchableOpacity onPress={onClose} style={{ opacity: 0.6 }}>
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>LABEL</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              onSubmitEditing={handleSave}
              autoFocus
              maxLength={200}
              placeholderTextColor={colors.textMuted}
              placeholder="Task name…"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHY? (OPTIONAL)</Text>
            <TextInput
              value={why}
              onChangeText={setWhy}
              maxLength={150}
              placeholderTextColor={colors.textMuted}
              placeholder="Your motivation…"
              style={styles.input}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TYPE</Text>
            <View style={styles.typeRow}>
              {(['daily', 'backlog'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>POINT VALUE (OPTIONAL, 1-10)</Text>
            <TextInput
              value={points}
              onChangeText={(t) => setPoints(t.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={2}
              placeholderTextColor={colors.textMuted}
              placeholder="0"
              style={styles.input}
            />
          </View>

          <TouchableOpacity onPress={() => setVisible((v) => !v)} style={styles.visibilityRow}>
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={14}
              color={visible ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.visibilityText, visible && styles.visibilityTextActive]}>
              {visible ? 'VISIBLE TO FRIENDS' : 'HIDDEN FROM FRIENDS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!label.trim()}
            style={[styles.saveBtn, !label.trim() && styles.saveBtnDisabled]}
          >
            <Text style={styles.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
    ...shadows.pixelUp,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.text,
  },
  field: { gap: 4 },
  fieldLabel: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.textMuted,
  },
  input: {
    fontFamily: fonts.vt323,
    fontSize: 22,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    ...shadows.pixel,
  },
  typeBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    ...shadows.glowAccent,
  },
  typeBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: colors.accent,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.textMuted,
  },
  visibilityTextActive: {
    color: colors.accent,
  },
  saveBtn: {
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    alignItems: 'center',
    ...shadows.pixel,
    ...shadows.glowAccent,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.white,
  },
});
