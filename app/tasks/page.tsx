'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomTasks } from '@/hooks/useCustomTasks';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { TaskEditor } from '@/components/TaskEditor';
import { CustomTask } from '@/lib/types';
import {
  createCustomTask,
  updateCustomTask,
  archiveCustomTask,
  reorderCustomTasks,
} from '@/lib/firestore';
import { Pencil, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react';

function TaskRow({
  task,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
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
    <div
      className="flex items-center gap-2 p-3"
      style={{
        border: '2px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: '2px 2px 0 var(--border)',
      }}
    >
      <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
        {task.label}
      </span>
      <div className="flex gap-1 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-1 opacity-40 hover:opacity-100 disabled:opacity-20 transition-opacity"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-1 opacity-40 hover:opacity-100 disabled:opacity-20 transition-opacity"
        >
          <ChevronDown size={14} />
        </button>
        <button onClick={onEdit} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1 opacity-40 hover:opacity-100 transition-opacity">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function TasksInner({ uid }: { uid: string }) {
  const { tasks } = useCustomTasks(uid);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CustomTask | undefined>();
  const [defaultType, setDefaultType] = useState<'daily' | 'backlog'>('daily');

  const daily = tasks.filter((t) => t.type === 'daily' && !t.archived);
  const backlog = tasks.filter((t) => t.type === 'backlog' && !t.archived);

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

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

  const Section = ({
    title,
    list,
    type,
  }: {
    title: string;
    list: CustomTask[];
    type: 'daily' | 'backlog';
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 style={{ ...pixelFont, fontSize: '10px' }}>{title}</h2>
        <button
          onClick={() => openEditor(type)}
          className="flex items-center gap-1"
          style={{ ...pixelFont, fontSize: '8px', color: 'var(--accent)' }}
        >
          <Plus size={12} /> ADD
        </button>
      </div>
      {list.length === 0 ? (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
          None yet
        </p>
      ) : (
        list.map((task, i) => (
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
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24 px-4 pt-6" style={{ background: 'var(--bg)' }}>
      <h1 style={{ ...pixelFont, fontSize: '14px', marginBottom: 24, color: 'var(--accent)' }}>
        MY TASKS
      </h1>

      <div className="space-y-8">
        <Section title="DAILY" list={daily} type="daily" />
        <Section title="BACKLOG" list={backlog} type="backlog" />
      </div>

      {editorOpen && (
        <TaskEditor
          task={editingTask}
          defaultType={defaultType}
          onSave={handleSave}
          onClose={() => { setEditorOpen(false); setEditingTask(undefined); }}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  return (
    <AuthGuard>
      {user && <TasksInner uid={user.uid} />}
    </AuthGuard>
  );
}
