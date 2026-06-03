import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useCustomTasks } from '../../hooks/useCustomTasks';
import { TaskEditor } from '../../components/TaskEditor';
import { CustomTask } from '../../lib/types';
import {
  createCustomTask, updateCustomTask, archiveCustomTask, reorderCustomTasks,
} from '../../lib/firestore';
import { colors, fonts, shadows } from '../../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function TasksInner({ uid }: { uid: string }) {
  const { tasks } = useCustomTasks(uid);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | undefined>();
  const [defaultType, setDefaultType] = useState<'daily' | 'backlog'>('daily');
  const insets = useSafeAreaInsets();

  const daily = tasks.filter((t) => t.type === 'daily' && !t.archived);
  const backlog = tasks.filter((t) => t.type === 'backlog' && !t.archived);

  async function handleSave(data: Partial<CustomTask>) {
    if (editingTask) {
      await updateCustomTask(uid, editingTask.id, data);
    } else {
      await createCustomTask({ uid, label: data.label!, type: data.type!, order: tasks.length, archived: false });
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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>MY TASKS</Text>
        <View style={styles.sections}>
          <Section title="DAILY" list={daily} type="daily" />
          <Section title="BACKLOG" list={backlog} type="backlog" />
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
  if (!user) return null;
  return <TasksInner uid={user.uid} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: { fontFamily: fonts.pixel, fontSize: 14, color: colors.accent, marginBottom: 24 },
  sections: { gap: 32 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.pixel, fontSize: 10, color: colors.text },
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
    shadowColor: colors.border,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  taskLabel: { flex: 1, fontFamily: fonts.inter, fontSize: 14, color: colors.text },
  taskActions: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  actionBtn: { padding: 4, opacity: 0.4 },
  actionBtnDisabled: { opacity: 0.2 },
});
