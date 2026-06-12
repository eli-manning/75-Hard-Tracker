import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomTask, DayEntry } from '../lib/types';
import { CustomTaskItem } from './CustomTaskItem';
import { TaskEditor } from './TaskEditor';
import { createCustomTask, updateCustomTask, archiveCustomTask } from '../lib/firestore';
import { fonts } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

interface CustomTaskListProps {
  tasks: CustomTask[];
  dayEntry: DayEntry;
  uid: string;
  readOnly: boolean;
  hideActions?: boolean;
  onDayUpdate: (updates: Partial<DayEntry>) => void;
  onNudge?: (taskKey: string, message: string) => void;
  nudgedTasks?: Set<string>;
}

export function CustomTaskList({ tasks, dayEntry, uid, readOnly, hideActions, onDayUpdate, onNudge, nudgedTasks }: CustomTaskListProps) {
  const { theme } = useTheme();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | undefined>();
  const [defaultType, setDefaultType] = useState<'daily' | 'backlog'>('daily');
  const [dailyOpen, setDailyOpen] = useState(true);
  const [backlogOpen, setBacklogOpen] = useState(true);

  const dailyTasks = tasks.filter((t) => t.type === 'daily' && !t.archived);
  const backlogTasks = tasks.filter((t) => t.type === 'backlog' && !t.archived);

  function toggleDailyTask(taskId: string) {
    const current = dayEntry.customTasksCompleted ?? [];
    const updated = current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId];
    onDayUpdate({ customTasksCompleted: updated });
  }

  async function toggleBacklogTask(task: CustomTask) {
    await archiveCustomTask(uid, task.id);
  }

  function handleSetProgress(task: CustomTask, amount: number) {
    const goalAmount = task.goalAmount ?? 0;
    if (goalAmount <= 0) return;
    const currentProgress = dayEntry.customTaskProgress ?? {};
    const newProgress = { ...currentProgress, [task.id]: amount };
    const currentCompleted = dayEntry.customTasksCompleted ?? [];
    let newCompleted: string[];
    if (amount >= goalAmount) {
      newCompleted = currentCompleted.includes(task.id)
        ? currentCompleted
        : [...currentCompleted, task.id];
    } else {
      newCompleted = currentCompleted.filter((id) => id !== task.id);
    }
    onDayUpdate({ customTaskProgress: newProgress, customTasksCompleted: newCompleted });
  }

  function handleResetProgress(task: CustomTask) {
    const currentProgress = dayEntry.customTaskProgress ?? {};
    const newProgress = { ...currentProgress, [task.id]: 0 };
    const newCompleted = (dayEntry.customTasksCompleted ?? []).filter((id) => id !== task.id);
    onDayUpdate({ customTaskProgress: newProgress, customTasksCompleted: newCompleted });
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

  function openEditor(type: 'daily' | 'backlog', task?: CustomTask) {
    setDefaultType(type);
    setEditingTask(task);
    setEditorOpen(true);
  }

  return (
    <>
      {/* Daily Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setDailyOpen((o) => !o)} style={styles.backlogToggle}>
            <Ionicons name={dailyOpen ? 'chevron-down' : 'chevron-forward'} size={12} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>YOUR TASKS</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity onPress={() => openEditor('daily')} style={styles.addBtn}>
              <Ionicons name="add" size={12} color={theme.accent} />
              <Text style={[styles.addText, { color: theme.accent }]}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>

        {dailyOpen && (
          dailyTasks.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>No daily tasks yet</Text>
          ) : (
            <View style={styles.taskList}>
              {dailyTasks.map((task) => {
                const isGoalTask = typeof task.goalAmount === 'number' && task.goalAmount > 0;
                return (
                  <CustomTaskItem
                    key={task.id}
                    task={task}
                    completed={(dayEntry.customTasksCompleted ?? []).includes(task.id)}
                    readOnly={readOnly}
                    hideActions={hideActions}
                    progressAmount={isGoalTask ? (dayEntry.customTaskProgress?.[task.id] ?? 0) : undefined}
                    onToggle={() => toggleDailyTask(task.id)}
                    onEdit={() => openEditor('daily', task)}
                    onDelete={() => archiveCustomTask(uid, task.id)}
                    onSetProgress={isGoalTask && !readOnly ? (amt) => handleSetProgress(task, amt) : undefined}
                    onResetProgress={isGoalTask && !readOnly ? () => handleResetProgress(task) : undefined}
                    onNudge={onNudge ? () => onNudge(`custom-${task.id}`, task.label) : undefined}
                    nudgedAlready={nudgedTasks?.has(`custom-${task.id}`)}
                  />
                );
              })}
            </View>
          )
        )}
      </View>

      {/* Backlog */}
      <View style={[styles.section, { marginTop: dailyOpen ? 16 : 0 }]}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setBacklogOpen((o) => !o)} style={styles.backlogToggle}>
            <Ionicons
              name={backlogOpen ? 'chevron-down' : 'chevron-forward'}
              size={12}
              color={theme.text}
            />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>BACKLOG</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity onPress={() => openEditor('backlog')} style={styles.addBtn}>
              <Ionicons name="add" size={12} color={theme.accent} />
              <Text style={[styles.addText, { color: theme.accent }]}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>

        {backlogOpen && (
          backlogTasks.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>Backlog is empty</Text>
          ) : (
            <View style={styles.taskList}>
              {backlogTasks.map((task) => (
                <CustomTaskItem
                  key={task.id}
                  task={task}
                  completed={false}
                  readOnly={readOnly}
                  hideActions={hideActions}
                  onToggle={() => toggleBacklogTask(task)}
                  onEdit={() => openEditor('backlog', task)}
                  onDelete={() => archiveCustomTask(uid, task.id)}
                />
              ))}
            </View>
          )
        )}
      </View>

      {editorOpen && (
        <TaskEditor
          task={editingTask}
          defaultType={defaultType}
          onSave={handleSave}
          onClose={() => { setEditorOpen(false); setEditingTask(undefined); }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontFamily: fonts.pixel, fontSize: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontFamily: fonts.pixel, fontSize: 8 },
  empty: { fontFamily: fonts.inter, fontSize: 13 },
  taskList: { gap: 4 },
  backlogToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
