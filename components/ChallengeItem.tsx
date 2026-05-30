'use client';

import { ReactNode } from 'react';

interface ChallengeItemProps {
  label: string;
  completed: boolean;
  readOnly: boolean;
  children?: ReactNode;
  onToggle?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function ChallengeItem({
  label,
  completed,
  readOnly,
  children,
  onToggle,
  disabled,
  disabledReason,
}: ChallengeItemProps) {
  const isDisabled = readOnly || disabled;

  function handleRowClick() {
    if (!isDisabled && onToggle) onToggle();
  }

  return (
    <div
      onClick={handleRowClick}
      className="p-3 transition-all duration-200"
      style={{
        border: completed ? '2px solid var(--green)' : '2px solid var(--border)',
        background: completed ? 'var(--green-light)' : 'var(--surface)',
        boxShadow: completed ? 'var(--glow-green), 2px 2px 0 #000' : '2px 2px 0 #000',
        cursor: isDisabled ? 'default' : 'pointer',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Pixel checkbox */}
        <div
          className="shrink-0 mt-0.5 transition-all duration-150"
          style={{
            width: 22,
            height: 22,
            border: completed ? '2px solid var(--green)' : '2px solid var(--text-muted)',
            background: completed ? 'var(--green)' : 'transparent',
            boxShadow: completed ? 'var(--glow-green)' : 'none',
            opacity: isDisabled && !completed ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {completed && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3 3 7-7" stroke="#0c0b08" strokeWidth="2.5" strokeLinecap="square" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span
            style={{
              fontFamily: '"VT323", monospace',
              fontSize: '20px',
              color: completed ? 'var(--green)' : 'var(--text)',
              textDecoration: completed ? 'line-through' : 'none',
              opacity: completed ? 0.7 : 1,
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </span>
          {disabled && disabledReason && (
            <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '6px', color: 'var(--text-muted)', marginTop: 3 }}>
              {disabledReason}
            </p>
          )}
          {/* Stop propagation so sub-controls don't fire row toggle */}
          {children && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
