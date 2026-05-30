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

  return (
    <div
      className="p-3 transition-all duration-200"
      style={{
        border: completed ? '2px solid var(--green)' : '2px solid var(--border)',
        background: completed ? 'var(--green-light)' : 'var(--surface)',
        boxShadow: completed ? 'var(--glow-green), 2px 2px 0 #000' : '2px 2px 0 #000',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Pixel checkbox */}
        <button
          onClick={isDisabled ? undefined : onToggle}
          title={disabled ? disabledReason : undefined}
          className="shrink-0 mt-0.5 transition-all duration-150 active:scale-95"
          style={{
            width: 22,
            height: 22,
            border: completed ? '2px solid var(--green)' : '2px solid var(--text-muted)',
            background: completed ? 'var(--green)' : 'transparent',
            boxShadow: completed ? 'var(--glow-green)' : 'none',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled && !completed ? 0.4 : 1,
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
            <p
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: 'var(--text-muted)',
                marginTop: 3,
              }}
            >
              {disabledReason}
            </p>
          )}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}
