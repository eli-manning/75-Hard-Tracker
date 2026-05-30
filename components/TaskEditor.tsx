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
  const vt323 = { fontFamily: '"VT323", monospace' };

  function handleSave() {
    if (!label.trim()) return;
    onSave({ label: label.trim(), type });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 space-y-4"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderBottom: 'none',
          boxShadow: '0 -4px 0 #000, var(--glow-accent)',
          maxWidth: 480,
          margin: '0 auto',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{ ...pixelFont, fontSize: '9px', color: 'var(--text)' }}>
            {task ? 'EDIT TASK' : 'NEW TASK'}
          </span>
          <button onClick={onClose} className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
            <X size={18} color="var(--text)" />
          </button>
        </div>

        <div className="space-y-1">
          <label style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>LABEL</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className="w-full px-3 py-2"
            style={{
              ...vt323,
              fontSize: '22px',
              border: '2px solid var(--border)',
              background: 'var(--surface-2)',
              outline: 'none',
              color: 'var(--text)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        <div className="space-y-1">
          <label style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>TYPE</label>
          <div className="flex gap-2">
            {(['daily', 'backlog'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="flex-1 py-2 cursor-pointer transition-all duration-150"
                style={{
                  ...pixelFont,
                  fontSize: '7px',
                  border: '2px solid',
                  borderColor: type === t ? 'var(--accent)' : 'var(--border)',
                  boxShadow: type === t ? 'var(--glow-accent), 2px 2px 0 #000' : '2px 2px 0 #000',
                  background: type === t ? 'var(--accent-light)' : 'var(--surface-2)',
                  color: type === t ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!label.trim()}
          className="w-full py-3 cursor-pointer transition-all duration-150 active:translate-y-px disabled:opacity-40"
          style={{
            ...pixelFont,
            fontSize: '9px',
            border: '2px solid var(--accent)',
            boxShadow: 'var(--glow-accent), 3px 3px 0 #000',
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
