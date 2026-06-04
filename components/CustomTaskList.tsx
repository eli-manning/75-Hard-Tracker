import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomTask, DayEntry } from '../lib/types';
import { CustomTaskItem } from './CustomTaskItem';
import { TaskEditor } from './TaskEditor';
import { createCustomTask, updateCustomTask, archiveCustomTask } from '../lib/firestore';
import { colors, fonts } from '../lib/theme';

interface CustomTaskListProps {
  tasks: CustomTask[];
  dayEntry: DayEntry;
  uid: string;
  readOnly: boolean;
  onDayUpdate: (updates: Partial<DayEntry>) => void;
  onNudge?: (taskKey: string, message: string) => void;
  nudgedTasks?: Set<string>;
}

export function CustomTaskList({ tasks, dayEntry, uid, readOnly, onDayUpdate, onNudge, nudgedTasks }: CustomTaskListProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | undefined>();
  const [defaultType, setDefaultType] = useState<'daily' | 'backlog'>('daily');
  const [backlogOpen, setBacklogOpen] = useState(true);

  const dailyTasks = tasks.filter((t) => t.type === 'daily' && !t.archived);
  const backlogTasks = tasks.filter((t) => t.type === 'backlog' && !t.archived);

  function toggleDailyTask(taskId: string) {
    const current = dayEntry.customTasksCompleted;
    const updated = current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId];
    onDayUpdate({ customTasksCompleted: updated });
  }

  async function toggleBacklogTask(task: CustomTask) {
    await archiveCustomTask(uid, task.id);
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
          <Text style={styles.sectionTitle}>YOUR TASKS</Text>
          {!readOnly && (
            <TouchableOpacity onPress={() => openEditor('daily')} style={styles.addBtn}>
              <Ionicons name="add" size={12} color={colors.accent} />
              <Text style={styles.addText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>

        {dailyTasks.length === 0 ? (
          <Text style={styles.empty}>No daily tasks yet</Text>
        ) : (
          <View style={styles.taskList}>
            {dailyTasks.map((task) => (
              <CustomTaskItem
                key={task.id}
                task={task}
                completed={dayEntry.customTasksCompleted.includes(task.id)}
                readOnly={readOnly}
                onToggle={() => toggleDailyTask(task.id)}
                onEdit={() => openEditor('daily', task)}
                onDelete={() => archiveCustomTask(uid, task.id)}
                onNudge={onNudge ? () => onNudge(`custom-${task.id}`, task.label) : undefined}
                nudgedAlready={nudgedTasks?.has(`custom-${task.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      {/* Backlog */}
      <View style={[styles.section, { marginTop: 16 }]}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setBacklogOpen((o) => !o)} style={styles.backlogToggle}>
            <Ionicons
              name={backlogOpen ? 'chevron-down' : 'chevron-forward'}
              size={12}
              color={colors.text}
            />
            <Text style={styles.sectionTitle}>BACKLOG</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity onPress={() => openEditor('backlog')} style={styles.addBtn}>
              <Ionicons name="add" size={12} color={colors.accent} />
              <Text style={styles.addText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>

        {backlogOpen && (
          backlogTasks.length === 0 ? (
            <Text style={styles.empty}>Backlog is empty</Text>
          ) : (
            <View style={styles.taskList}>
              {backlogTasks.map((task) => (
                <CustomTaskItem
                  key={task.id}
                  task={task}
                  completed={false}
                  readOnly={readOnly}
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
  sectionTitle: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.accent,
  },
  empty: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: colors.textMuted,
  },
  taskList: {
    gap: 4,
  },
  backlogToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
