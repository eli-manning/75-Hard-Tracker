'use client';

import { useState } from 'react';
import { CustomTask } from '@/lib/types';
import { X } from 'lucide-react';

interface TaskEditorProps {
  task?: CustomTask;
  defaultType?: 'daily' | 'backlog';
  onSave: (task: Partial<CustomTask>) => void;
  onClose: () => void;
}

export function TaskEditor({ task, defaultType = 'daily', onSave, onClose }: TaskEditorProps) {
  const [label, setLabel] = useState(task?.label ?? '');
  const [type, setType] = useState<'daily' | 'backlog'>(task?.type ?? defaultType);

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

  function handleSave() {
    if (!label.trim()) return;
    onSave({ label: label.trim(), type });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 space-y-4"
        style={{
          background: 'var(--bg)',
          border: '2px solid var(--text)',
          borderBottom: 'none',
          boxShadow: '0 -4px 0 var(--text)',
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{ ...pixelFont, fontSize: '10px' }}>
            {task ? 'EDIT TASK' : 'NEW TASK'}
          </span>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Label input */}
        <div className="space-y-1">
          <label style={{ ...pixelFont, fontSize: '8px', color: 'var(--text-muted)' }}>
            LABEL
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-3 py-2 bg-white"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              border: '2px solid var(--text)',
              outline: 'none',
            }}
          />
        </div>

        {/* Type toggle */}
        <div className="space-y-1">
          <label style={{ ...pixelFont, fontSize: '8px', color: 'var(--text-muted)' }}>
            TYPE
          </label>
          <div className="flex gap-2">
            {(['daily', 'backlog'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  ...pixelFont,
                  fontSize: '8px',
                  padding: '6px 14px',
                  border: '2px solid var(--text)',
                  boxShadow: type === t ? '2px 2px 0 var(--text)' : '1px 1px 0 var(--text)',
                  background: type === t ? 'var(--accent)' : 'var(--surface)',
                  color: type === t ? '#fff' : 'var(--text)',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!label.trim()}
          className="w-full py-3 transition-all active:translate-y-px disabled:opacity-50"
          style={{
            ...pixelFont,
            fontSize: '10px',
            border: '2px solid var(--text)',
            boxShadow: '3px 3px 0 var(--text)',
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          SAVE
        </button>
      </div>
    </>
  );
}
