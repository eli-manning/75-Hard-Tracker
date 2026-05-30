'use client';

import { useEffect, useState } from 'react';

const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

export function LoadingScreen() {
  const [dots, setDots] = useState(0);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const d = setInterval(() => setDots((n) => (n + 1) % 4), 500);
    const b = setInterval(() => setFill((n) => Math.min(n + 1, 100)), 12);
    return () => { clearInterval(d); clearInterval(b); };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8" style={{ background: 'var(--bg)', zIndex: 100 }}>
      <div style={{ ...pixelFont, fontSize: '20px', color: 'var(--accent)', textShadow: 'var(--glow-accent)', lineHeight: 1.6 }}>
        75 HARD
      </div>
      <div style={{ width: 220 }}>
        <div style={{ border: '2px solid var(--border)', background: 'var(--bg)', height: 20 }}>
          <div style={{
            height: '100%',
            width: `${fill}%`,
            background: 'var(--accent)',
            boxShadow: 'var(--glow-accent)',
            transition: 'width 80ms linear',
          }} />
        </div>
        <p style={{ ...pixelFont, fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
          LOADING{'.'.repeat(dots)}
        </p>
      </div>
    </div>
  );
}
