'use client';


interface WaterTrackerProps {
  ozLogged: number;
  goal?: number;
  readOnly: boolean;
  onAdd: (oz: number) => void;
  onSetCustom: (oz: number) => void;
}

export function WaterTracker({ ozLogged, goal = 128, readOnly, onAdd, onSetCustom }: WaterTrackerProps) {
  const pct = Math.min(100, (ozLogged / goal) * 100);
  const done = ozLogged >= goal;

  const barColor = done ? 'var(--green)' : pct > 60 ? '#3b9ede' : '#1e6ea8';
  const barGlow = done ? 'var(--glow-green)' : '0 0 6px #3b9ede66';

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  const btnBase: React.CSSProperties = {
    ...pixelFont,
    fontSize: '7px',
    padding: '3px 8px',
    border: '2px solid var(--border)',
    boxShadow: '2px 2px 0 #000',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    cursor: 'pointer',
  };

  function stop(e: React.MouseEvent) { e.stopPropagation(); }

  return (
    <div className="mt-2 space-y-2" onClick={stop}>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-4" style={{ border: '2px solid var(--border)', background: 'var(--bg)' }}>
          <div className="h-full transition-all duration-300" style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: pct > 0 ? barGlow : 'none',
          }} />
        </div>
        <span style={{ ...vt323, fontSize: '18px', color: done ? 'var(--green)' : 'var(--text-muted)', minWidth: '72px', textAlign: 'right' }}>
          {ozLogged}/{goal}oz
        </span>
      </div>

      {!readOnly && (
        <>
          {/* Add + Reset row */}
          <div className="flex gap-1.5 flex-wrap">
            <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', alignSelf: 'center' }}>+</span>
            {[8, 16, 32].map((oz) => (
              <button key={oz} onClick={() => onAdd(oz)} style={btnBase} className="active:translate-y-px transition-transform">
                {oz}oz
              </button>
            ))}
            <button onClick={() => onSetCustom(0)} disabled={ozLogged <= 0}
              style={{ ...btnBase, color: 'var(--text-muted)', opacity: ozLogged <= 0 ? 0.3 : 1 }}
              className="active:translate-y-px transition-transform disabled:cursor-not-allowed">
              RESET
            </button>
          </div>

        </>
      )}
    </div>
  );
}
