'use client';

import { useState } from 'react';

interface WaterTrackerProps {
  ozLogged: number;
  goal?: number;
  readOnly: boolean;
  onAdd: (oz: number) => void;
  onSetCustom: (oz: number) => void;
}

export function WaterTracker({ ozLogged, goal = 128, readOnly, onAdd, onSetCustom }: WaterTrackerProps) {
  const [customInput, setCustomInput] = useState('');
  const pct = Math.min(100, (ozLogged / goal) * 100);
  const done = ozLogged >= goal;

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(customInput);
    if (!isNaN(val) && val > 0) {
      onSetCustom(val);
      setCustomInput('');
    }
  }

  const barColor = done
    ? 'var(--green)'
    : pct > 50
    ? '#3b82f6'
    : '#60a5fa';

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-4"
          style={{ border: '2px solid var(--text)', background: 'var(--bg)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <span
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: done ? 'var(--green)' : 'var(--text)',
            minWidth: '70px',
            textAlign: 'right',
          }}
        >
          {ozLogged} / {goal} oz
        </span>
      </div>

      {/* Quick-add buttons */}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          {[8, 16, 32].map((oz) => (
            <button
              key={oz}
              onClick={() => onAdd(oz)}
              className="px-3 py-1 text-xs transition-all active:translate-y-px"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                border: '2px solid var(--text)',
                boxShadow: '2px 2px 0 var(--text)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              +{oz}
            </button>
          ))}

          {/* Custom input */}
          <form onSubmit={handleCustomSubmit} className="flex gap-1">
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="oz"
              className="w-14 px-2 py-1 text-xs bg-white"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                border: '2px solid var(--border)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="px-2 py-1 text-xs"
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                border: '2px solid var(--text)',
                boxShadow: '2px 2px 0 var(--text)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              SET
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
