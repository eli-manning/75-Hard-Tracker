import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { createCrew } from '../../lib/firestore';
import { CREW_ICONS, getCrewIconIon } from '../../lib/crews';
import { colors, fonts, shadows } from '../../lib/theme';
import { CrewTask } from '../../lib/types';

const CORE_TASK_LABELS: { key: keyof ActiveTasks; label: string }[] = [
  { key: 'workout1', label: 'WORKOUT 1' },
  { key: 'workout2', label: 'WORKOUT 2 (OUTDOOR)' },
  { key: 'diet',     label: 'DIET' },
  { key: 'water',    label: 'WATER' },
  { key: 'reading',  label: 'READING' },
  { key: 'photo',    label: 'PROGRESS PHOTO' },
];

interface ActiveTasks {
  workout1: boolean;
  workout2: boolean;
  diet: boolean;
  water: boolean;
  reading: boolean;
  photo: boolean;
}

export default function CreateCrewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('');
  const [activeTasks, setActiveTasks] = useState<ActiveTasks>({
    workout1: true, workout2: true, diet: true, water: true, reading: true, photo: true,
  });
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskAmount, setCustomTaskAmount] = useState('');
  const [customTaskUnit, setCustomTaskUnit] = useState('');
  const [customTasks, setCustomTasks] = useState<CrewTask[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function addCustomTask() {
    const label = customTaskInput.trim().slice(0, 60);
    if (!label) return;
    const parsedAmount = parseFloat(customTaskAmount);
    setCustomTasks((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        label,
        order: prev.length,
        ...(!isNaN(parsedAmount) && parsedAmount > 0 ? { amount: parsedAmount } : {}),
        ...(customTaskUnit.trim() ? { unit: customTaskUnit.trim().slice(0, 20) } : {}),
      },
    ]);
    setCustomTaskInput('');
    setCustomTaskAmount('');
    setCustomTaskUnit('');
  }

  function removeCustomTask(id: string) {
    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleCreate() {
    if (!user) return;
    const hasAnyTask = Object.values(activeTasks).some(Boolean) || customTasks.length > 0;
    if (!hasAnyTask) { setSubmitError('Select at least one task'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const crewId = await createCrew(
        {
          name: name.trim(),
          icon,
          joinCode: '', // will be overwritten by createCrew
          creatorUid: user.uid,
          members: [user.uid],
          admins: [user.uid],
          activeTasks,
          customCrewTasks: customTasks,
          crewStreak: 0,
          longestCrewStreak: 0,
          lastStreakDate: '',
        },
        user.uid
      );
      router.replace(`/crews/${crewId}` as any);
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Failed to create crew');
    } finally {
      setSubmitting(false);
    }
  }

  const steps = ['NAME', 'ICON', 'TASKS'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 0 ? setStep(step - 1) : router.back())} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE CREW</Text>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.stepDot, i === step && styles.stepDotActive]} />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0 — Name */}
        {step === 0 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>CREW NAME</Text>
            <TextInput
              value={name}
              onChangeText={(v) => setName(v.slice(0, 30))}
              placeholder="Enter crew name…"
              placeholderTextColor={colors.textMuted}
              style={styles.nameInput}
              maxLength={30}
              autoFocus
            />
            <Text style={styles.charCount}>{name.length}/30</Text>
          </View>
        )}

        {/* Step 1 — Icon */}
        {step === 1 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>CHOOSE AN ICON</Text>
            <View style={styles.iconGrid}>
              {CREW_ICONS.map((ci) => (
                <TouchableOpacity
                  key={ci.key}
                  style={[styles.iconCard, icon === ci.key && styles.iconCardSelected]}
                  onPress={() => setIcon(ci.key)}
                >
                  <Ionicons name={ci.ion as any} size={22} color={icon === ci.key ? colors.white : colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2 — Tasks */}
        {step === 2 && (
          <View style={styles.stepSection}>
            <Text style={styles.stepTitle}>WHICH TASKS COUNT?</Text>
            <Text style={styles.stepSubtitle}>Everyone in the crew must complete these daily</Text>

            <View style={styles.taskToggles}>
              {CORE_TASK_LABELS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={styles.toggleRow}
                  onPress={() => setActiveTasks((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                  <View style={[styles.toggleBox, activeTasks[key] && styles.toggleBoxOn]}>
                    {activeTasks[key] && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                  <Text style={styles.toggleLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.customTasksHeading}>CUSTOM TASKS</Text>
            <View style={styles.customTaskInput}>
              <TextInput
                value={customTaskInput}
                onChangeText={(v) => setCustomTaskInput(v.slice(0, 60))}
                placeholder="Add a custom task…"
                placeholderTextColor={colors.textMuted}
                style={styles.customInput}
              />
              <TouchableOpacity
                onPress={addCustomTask}
                disabled={!customTaskInput.trim()}
                style={[styles.addTaskBtn, !customTaskInput.trim() && styles.btnDisabled]}
              >
                <Text style={styles.addTaskBtnText}>ADD</Text>
              </TouchableOpacity>
            </View>
            {customTaskInput.trim().length > 0 && (
              <View style={styles.customAmountRow}>
                <TextInput
                  value={customTaskAmount}
                  onChangeText={(v) => setCustomTaskAmount(v.replace(/[^0-9.]/g, ''))}
                  placeholder="Amount"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  style={[styles.customInput, { width: 90 }]}
                />
                <TextInput
                  value={customTaskUnit}
                  onChangeText={(v) => setCustomTaskUnit(v.slice(0, 20))}
                  placeholder="Unit (e.g. miles)"
                  placeholderTextColor={colors.textMuted}
                  maxLength={20}
                  style={[styles.customInput, { flex: 1 }]}
                />
              </View>
            )}
            {customTasks.map((t) => (
              <View key={t.id} style={styles.customTaskRow}>
                <Text style={styles.customTaskLabel} numberOfLines={1}>{t.label}</Text>
                {t.amount != null && (
                  <Text style={styles.customTaskAmount}>
                    {t.amount}{t.unit ? ` ${t.unit}` : ''}
                  </Text>
                )}
                <TouchableOpacity onPress={() => removeCustomTask(t.id)}>
                  <Ionicons name="close" size={14} color={colors.red} />
                </TouchableOpacity>
              </View>
            ))}

            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          </View>
        )}
      </ScrollView>

      {/* Bottom button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {step < 2 ? (
          <TouchableOpacity
            style={[styles.nextBtn, (step === 0 && !name.trim()) || (step === 1 && !icon) ? styles.btnDisabled : {}]}
            disabled={(step === 0 && !name.trim()) || (step === 1 && !icon)}
            onPress={() => setStep(step + 1)}
          >
            <Text style={styles.nextBtnText}>NEXT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, submitting && styles.btnDisabled]}
            disabled={submitting}
            onPress={handleCreate}
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.nextBtnText}>CREATE CREW</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: fonts.pixel, fontSize: 9, color: colors.accent },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.accent },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, gap: 16 },
  stepSection: { gap: 16 },
  stepTitle: { fontFamily: fonts.pixel, fontSize: 11, color: colors.text },
  stepSubtitle: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted },
  nameInput: {
    fontFamily: fonts.vt323, fontSize: 22, color: colors.text,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 14,
  },
  charCount: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, textAlign: 'right' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCard: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconCardSelected: {
    borderColor: colors.accent, backgroundColor: colors.accent,
    ...shadows.glowAccent,
  },
  taskToggles: { gap: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleBox: {
    width: 22, height: 22, borderWidth: 2, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBoxOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  toggleLabel: { fontFamily: fonts.vt323, fontSize: 18, color: colors.text },
  customTasksHeading: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted, marginTop: 8 },
  customTaskInput: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput: {
    flex: 1, fontFamily: fonts.inter, fontSize: 13, color: colors.text,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 10,
  },
  addTaskBtn: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentLight,
  },
  addTaskBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.accent },
  customAmountRow: { flexDirection: 'row', gap: 8 },
  customTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  customTaskLabel: { flex: 1, fontFamily: fonts.vt323, fontSize: 16, color: colors.text },
  customTaskAmount: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },
  errorText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.red },
  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: colors.border },
  nextBtn: {
    paddingVertical: 16, borderWidth: 2,
    borderColor: colors.accent, backgroundColor: colors.accent,
    alignItems: 'center', ...shadows.pixel,
  },
  nextBtnText: { fontFamily: fonts.pixel, fontSize: 9, color: colors.white },
  btnDisabled: { opacity: 0.4 },
});
