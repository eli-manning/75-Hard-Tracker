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
      className="flex items-center gap-3 p-3 transition-all duration-200"
      style={{
        border: completed ? '2px solid var(--green)' : '2px solid var(--border)',
        background: completed ? 'var(--green-light)' : 'var(--surface)',
        boxShadow: completed ? 'var(--glow-green), 2px 2px 0 #000' : '2px 2px 0 #000',
      }}
    >
      <button
        onClick={readOnly ? undefined : onToggle}
        className="shrink-0 cursor-pointer transition-all duration-150 active:scale-95"
        style={{
          width: 22,
          height: 22,
          border: completed ? '2px solid var(--green)' : '2px solid var(--text-muted)',
          background: completed ? 'var(--green)' : 'transparent',
          boxShadow: completed ? 'var(--glow-green)' : 'none',
          cursor: readOnly ? 'not-allowed' : 'pointer',
          opacity: readOnly && !completed ? 0.4 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {completed && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5l3 3 7-7" stroke="#0c0b08" strokeWidth="2.5" strokeLinecap="square" />
          </svg>
        )}
      </button>

      <span
        className="flex-1"
        style={{
          fontFamily: '"VT323", monospace',
          fontSize: '20px',
          color: completed ? 'var(--green)' : 'var(--text)',
          textDecoration: completed ? 'line-through' : 'none',
          opacity: completed ? 0.7 : 1,
          letterSpacing: '0.02em',
        }}
      >
        {task.label}
      </span>

      {!readOnly && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 cursor-pointer opacity-30 hover:opacity-80 transition-opacity duration-150"
            style={{ color: 'var(--text)' }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 cursor-pointer opacity-30 hover:opacity-80 transition-opacity duration-150"
            style={{ color: 'var(--red)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
