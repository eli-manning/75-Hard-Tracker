'use client';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;
  return (
    <div
      className="inline-block px-3 py-1 text-xs"
      style={{
        fontFamily: '"Press Start 2P", monospace',
        background: 'var(--accent)',
        color: '#fff',
        border: '2px solid var(--text)',
        boxShadow: '2px 2px 0 var(--text)',
      }}
    >
      {streak} DAY STREAK
    </div>
  );
}
