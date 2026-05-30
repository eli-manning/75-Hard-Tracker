'use client';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;
  return (
    <div
      className="inline-block px-3 py-1.5"
      style={{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        background: 'var(--accent-light)',
        color: 'var(--accent)',
        border: '2px solid var(--accent)',
        boxShadow: 'var(--glow-accent), 2px 2px 0 #000',
        letterSpacing: '0.05em',
      }}
    >
      {streak} DAY STREAK
    </div>
  );
}
