import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useCustomTasks } from '../hooks/useCustomTasks';
import { TaskEditor } from '../components/TaskEditor';
import { CustomTask, UserProfile, Crew } from '../lib/types';
import {
  createCustomTask, updateCustomTask, archiveCustomTask, reorderCustomTasks,
  getUserCrews, updateHiddenCoreTasks, subscribeToProfile,
} from '../lib/firestore';
import { getCrewIconIon } from '../lib/crews';
import { getSessionCached } from '../lib/cache';
import { colors, fonts, shadows } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CORE_TASK_LABELS: { key: keyof NonNullable<UserProfile['hiddenCoreTasks']>; label: string }[] = [
  { key: 'workout1', label: 'Workout #1 — 45 min' },
  { key: 'workout2', label: 'Workout #2 — Outdoor' },
  { key: 'diet',    label: 'No cheat meals today' },
  { key: 'water',   label: 'Drink 1 gallon of water' },
  { key: 'reading', label: 'Read 10 pages' },
  { key: 'photo',   label: 'Progress photo' },
];

function TaskRow({
  task, onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  task: CustomTask;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskLabel} numberOfLines={2}>{task.label}</Text>
      <View style={styles.taskActions}>
        <TouchableOpacity onPress={onMoveUp} disabled={!canMoveUp} style={[styles.actionBtn, !canMoveUp && styles.actionBtnDisabled]}>
          <Ionicons name="chevron-up" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMoveDown} disabled={!canMoveDown} style={[styles.actionBtn, !canMoveDown && styles.actionBtnDisabled]}>
          <Ionicons name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <Ionicons name="pencil-outline" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={14} color={colors.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TasksInner({ uid, profile: initialProfile }: { uid: string; profile: UserProfile }) {
  const router = useRouter();
  const { tasks } = useCustomTasks(uid);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | undefined>();
  const [defaultType, setDefaultType] = useState<'daily' | 'backlog'>('daily');
  const [profile, setProfile] = useState(initialProfile);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [crewsLoading, setCrewsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribeToProfile(uid, (fresh) => setProfile(fresh));
    return unsub;
  }, [uid]);

  useEffect(() => {
    getUserCrews(uid)
      .then((c) => setCrews(c))
      .catch(() => {})
      .finally(() => setCrewsLoading(false));
  }, [uid]);

  const daily = tasks.filter((t) => t.type === 'daily' && !t.archived);
  const backlog = tasks.filter((t) => t.type === 'backlog' && !t.archived);
  const isGeneral = profile.challengeMode === 'general';
  const hidden = profile.hiddenCoreTasks ?? {};

  function handleHiddenToggle(key: keyof NonNullable<UserProfile['hiddenCoreTasks']>) {
    const newHidden: UserProfile['hiddenCoreTasks'] = { ...hidden, [key]: !hidden[key] };
    setProfile((p) => ({ ...p, hiddenCoreTasks: newHidden }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateHiddenCoreTasks(uid, newHidden, profile, tasks).catch(() => {});
    }, 500);
  }

  async function handleSave(data: Partial<CustomTask>) {
    if (editingTask) {
      await updateCustomTask(uid, editingTask.id, data);
    } else {
      await createCustomTask({
        uid,
        label: data.label!,
        type: data.type!,
        order: tasks.length,
        archived: false,
        visible: data.visible ?? true,
        ...(data.why ? { why: data.why } : {}),
        ...(data.points !== undefined ? { points: data.points } : {}),
        ...(data.goalAmount !== undefined ? { goalAmount: data.goalAmount } : {}),
        ...(data.goalUnit ? { goalUnit: data.goalUnit } : {}),
      });
    }
    setEditorOpen(false);
    setEditingTask(undefined);
  }

  async function move(list: CustomTask[], idx: number, dir: -1 | 1) {
    const newList = [...list];
    const swap = newList[idx + dir];
    newList[idx + dir] = newList[idx];
    newList[idx] = swap;
    await reorderCustomTasks(uid, newList.map((t) => t.id));
  }

  function openEditor(type: 'daily' | 'backlog', task?: CustomTask) {
    setDefaultType(type);
    setEditingTask(task);
    setEditorOpen(true);
  }

  const Section = ({ title, list, type }: { title: string; list: CustomTask[]; type: 'daily' | 'backlog' }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => openEditor(type)} style={styles.addBtn}>
          <Ionicons name="add" size={12} color={colors.accent} />
          <Text style={styles.addText}>ADD</Text>
        </TouchableOpacity>
      </View>
      {list.length === 0 ? (
        <Text style={styles.emptyText}>None yet</Text>
      ) : (
        <View style={styles.taskList}>
          {list.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={() => openEditor(type, task)}
              onDelete={() => archiveCustomTask(uid, task.id)}
              onMoveUp={() => move(list, i, -1)}
              onMoveDown={() => move(list, i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < list.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>MY TASKS</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sections}>
          {/* Core tasks — general fitness only */}
          {isGeneral && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CORE TASKS</Text>
              <Text style={styles.sectionHint}>Toggle off tasks you don't want to track</Text>
              <View style={styles.taskList}>
                {CORE_TASK_LABELS.map(({ key, label }) => (
                  <View key={key} style={styles.coreTaskRow}>
                    <Text style={[styles.coreTaskLabel, hidden[key] && styles.coreTaskLabelHidden]}>
                      {label}
                    </Text>
                    <Switch
                      value={!hidden[key]}
                      onValueChange={() => handleHiddenToggle(key)}
                      trackColor={{ false: colors.border, true: colors.accentLight }}
                      thumbColor={!hidden[key] ? colors.accent : colors.textMuted}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <Section title="DAILY" list={daily} type="daily" />
          <Section title="BACKLOG" list={backlog} type="backlog" />

          {/* Crew tasks — read-only */}
          {!crewsLoading && crews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CREW TASKS</Text>
              <Text style={styles.sectionHint}>Manage crew tasks from the Crews tab</Text>
              {crews.filter((c) => c.customCrewTasks.length > 0).map((crew) => (
                <View key={crew.id} style={styles.crewGroup}>
                  <View style={styles.crewGroupHeader}>
                    <Ionicons name={getCrewIconIon(crew.icon) as any} size={12} color={colors.textMuted} />
                    <Text style={styles.crewGroupName}>{crew.name.toUpperCase()}</Text>
                  </View>
                  {crew.customCrewTasks.map((task) => (
                    <View key={task.id} style={styles.crewTaskRow}>
                      <Text style={styles.crewTaskLabel}>{task.label}</Text>
                      {task.amount != null && (
                        <Text style={styles.crewTaskAmount}>
                          {task.amount}{task.unit ? ` ${task.unit}` : ''}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              ))}
              {crews.every((c) => c.customCrewTasks.length === 0) && (
                <Text style={styles.emptyText}>No crew tasks set</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {editorOpen && (
        <TaskEditor
          task={editingTask}
          defaultType={defaultType}
          onSave={handleSave}
          onClose={() => { setEditorOpen(false); setEditingTask(undefined); }}
        />
      )}
    </View>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('crewday-profile'));

  useEffect(() => {
    if (!user?.uid || profile) return;
    import('../lib/firestore').then(({ getUserProfile }) => {
      getUserProfile(user.uid).then((p) => { if (p) setProfile(p); }).catch(() => {});
    });
  }, [user?.uid]);

  if (!user || !profile) return null;
  return <TasksInner uid={user.uid} profile={profile} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  pageTitle: { fontFamily: fonts.pixel, fontSize: 12, color: colors.accent },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  sections: { gap: 32 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.pixel, fontSize: 10, color: colors.text },
  sectionHint: { fontFamily: fonts.inter, fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  emptyText: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted },
  taskList: { gap: 4 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  taskLabel: { flex: 1, fontFamily: fonts.vt323, fontSize: 18, color: colors.text },
  taskActions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  actionBtn: { padding: 4, opacity: 0.4 },
  actionBtnDisabled: { opacity: 0.2 },
  coreTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  coreTaskLabel: { fontFamily: fonts.inter, fontSize: 14, color: colors.text, flex: 1 },
  coreTaskLabelHidden: { color: colors.textMuted, textDecorationLine: 'line-through' },
  crewGroup: { gap: 4, marginBottom: 12 },
  crewGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  crewGroupName: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  crewTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  crewTaskLabel: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted, flex: 1 },
  crewTaskAmount: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
});
