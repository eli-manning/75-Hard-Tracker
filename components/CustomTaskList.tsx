'use client';

import { useState } from 'react';
import { CustomTask, DayEntry } from '@/lib/types';
import { CustomTaskItem } from './CustomTaskItem';
import { TaskEditor } from './TaskEditor';
import { createCustomTask, updateCustomTask, archiveCustomTask } from '@/lib/firestore';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface CustomTaskListProps {
  tasks: CustomTask[];
  dayEntry: DayEntry;
  uid: string;
  readOnly: boolean;
  onDayUpdate: (updates: Partial<DayEntry>) => void;
}

export function CustomTaskList({ tasks, dayEntry, uid, readOnly, onDayUpdate }: CustomTaskListProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | undefined>();
  const [defaultType, setDefaultType] = useState<'daily' | 'backlog'>('daily');
  const [backlogOpen, setBacklogOpen] = useState(true);

  const dailyTasks = tasks.filter((t) => t.type === 'daily' && !t.archived);
  const backlogTasks = tasks.filter((t) => t.type === 'backlog' && !t.archived);

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

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
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span style={{ ...pixelFont, fontSize: '10px' }}>YOUR TASKS</span>
          {!readOnly && (
            <button
              onClick={() => openEditor('daily')}
              className="flex items-center gap-1"
              style={{ ...pixelFont, fontSize: '8px', color: 'var(--accent)' }}
            >
              <Plus size={12} /> ADD
            </button>
          )}
        </div>

        {dailyTasks.length === 0 ? (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
            No daily tasks yet
          </p>
        ) : (
          dailyTasks.map((task) => (
            <CustomTaskItem
              key={task.id}
              task={task}
              completed={dayEntry.customTasksCompleted.includes(task.id)}
              readOnly={readOnly}
              onToggle={() => toggleDailyTask(task.id)}
              onEdit={() => openEditor('daily', task)}
              onDelete={() => archiveCustomTask(uid, task.id)}
            />
          ))
        )}
      </div>

      {/* Backlog */}
      <div className="space-y-1 mt-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setBacklogOpen((o) => !o)}
            className="flex items-center gap-1"
            style={{ ...pixelFont, fontSize: '10px' }}
          >
            {backlogOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            BACKLOG
          </button>
          {!readOnly && (
            <button
              onClick={() => openEditor('backlog')}
              className="flex items-center gap-1"
              style={{ ...pixelFont, fontSize: '8px', color: 'var(--accent)' }}
            >
              <Plus size={12} /> ADD
            </button>
          )}
        </div>

        {backlogOpen && (
          backlogTasks.length === 0 ? (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
              Backlog is empty
            </p>
          ) : (
            backlogTasks.map((task) => (
              <CustomTaskItem
                key={task.id}
                task={task}
                completed={false}
                readOnly={readOnly}
                onToggle={() => toggleBacklogTask(task)}
                onEdit={() => openEditor('backlog', task)}
                onDelete={() => archiveCustomTask(uid, task.id)}
              />
            ))
          )
        )}
      </div>

      {/* Editor drawer */}
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
