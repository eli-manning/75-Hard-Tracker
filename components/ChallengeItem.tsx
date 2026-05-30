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
      className="p-3 transition-all"
      style={{
        border: '2px solid var(--border)',
        background: completed ? 'var(--green-light)' : 'var(--surface)',
        boxShadow: completed ? '2px 2px 0 var(--green)' : '2px 2px 0 var(--border)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Pixel checkbox */}
        <button
          onClick={isDisabled ? undefined : onToggle}
          title={disabled ? disabledReason : undefined}
          className="shrink-0 mt-0.5 transition-all active:scale-95"
          style={{
            width: 20,
            height: 20,
            border: '2px solid var(--text)',
            background: completed ? 'var(--green)' : 'var(--surface)',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled && !completed ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '1px 1px 0 var(--text)',
          }}
        >
          {completed && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
            </svg>
          )}
        </button>

        {/* Label + children */}
        <div className="flex-1 min-w-0">
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text)',
              textDecoration: completed ? 'line-through' : 'none',
              opacity: completed ? 0.7 : 1,
            }}
          >
            {label}
          </span>
          {disabled && disabledReason && (
            <p
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '7px',
                color: 'var(--text-muted)',
                marginTop: 2,
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
