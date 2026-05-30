'use client';

import { CustomTask } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';

interface CustomTaskItemProps {
  task: CustomTask;
  completed: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomTaskItem({ task, completed, readOnly, onToggle, onEdit, onDelete }: CustomTaskItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 transition-all"
      style={{
        border: '2px solid var(--border)',
        background: completed ? 'var(--green-light)' : 'var(--surface)',
        boxShadow: completed ? '2px 2px 0 var(--green)' : '2px 2px 0 var(--border)',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={readOnly ? undefined : onToggle}
        style={{
          width: 20,
          height: 20,
          border: '2px solid var(--text)',
          background: completed ? 'var(--green)' : 'var(--surface)',
          cursor: readOnly ? 'not-allowed' : 'pointer',
          opacity: readOnly && !completed ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '1px 1px 0 var(--text)',
        }}
      >
        {completed && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
          </svg>
        )}
      </button>

      {/* Label */}
      <span
        className="flex-1"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text)',
          textDecoration: completed ? 'line-through' : 'none',
          opacity: completed ? 0.7 : 1,
        }}
      >
        {task.label}
      </span>

      {/* Actions */}
      {!readOnly && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 opacity-40 hover:opacity-100 transition-opacity"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 opacity-40 hover:opacity-100 transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
