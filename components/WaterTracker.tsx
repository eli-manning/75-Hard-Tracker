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

  const barColor = done ? 'var(--green)' : pct > 60 ? '#3b9ede' : '#1e6ea8';
  const barGlow = done ? 'var(--glow-green)' : '0 0 6px #3b9ede66';

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(customInput);
    if (!isNaN(val) && val > 0) {
      onSetCustom(val);
      setCustomInput('');
    }
  }

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-4"
          style={{ border: '2px solid var(--border)', background: 'var(--bg)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: barColor,
              boxShadow: pct > 0 ? barGlow : 'none',
            }}
          />
        </div>
        <span
          style={{
            ...vt323,
            fontSize: '18px',
            color: done ? 'var(--green)' : 'var(--text-muted)',
            minWidth: '72px',
            textAlign: 'right',
          }}
        >
          {ozLogged}/{goal}oz
        </span>
      </div>

      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          {[8, 16, 32].map((oz) => (
            <button
              key={oz}
              onClick={() => onAdd(oz)}
              className="px-3 py-1 cursor-pointer transition-all duration-150 active:translate-y-px"
              style={{
                ...pixelFont,
                fontSize: '7px',
                border: '2px solid var(--border)',
                boxShadow: '2px 2px 0 #000',
                background: 'var(--surface-2)',
                color: 'var(--text)',
              }}
            >
              +{oz}
            </button>
          ))}
          <form onSubmit={handleCustomSubmit} className="flex gap-1">
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="oz"
              className="w-14 px-2 py-1"
              style={{
                ...pixelFont,
                fontSize: '7px',
                border: '2px solid var(--border)',
                background: 'var(--surface-2)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="px-2 py-1 cursor-pointer"
              style={{
                ...pixelFont,
                fontSize: '7px',
                border: '2px solid var(--border)',
                boxShadow: '2px 2px 0 #000',
                background: 'var(--surface-2)',
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
