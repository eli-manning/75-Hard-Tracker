'use client';

import Image from 'next/image';
import { UserProfile } from '@/lib/types';

interface UserTabBarProps {
  users: UserProfile[];
  activeUid: string;
  onSelectUser: (uid: string) => void;
  currentUserUid: string;
}

export function UserTabBar({ users, activeUid, onSelectUser, currentUserUid }: UserTabBarProps) {
  return (
    <div className="flex gap-3 px-4 pt-4 pb-3 overflow-x-auto">
      {users.map((u) => {
        const isActive = u.uid === activeUid;
        return (
          <button
            key={u.uid}
            onClick={() => onSelectUser(u.uid)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer transition-all duration-200"
            style={{ opacity: isActive ? 1 : 0.45 }}
          >
            {/* Portrait frame */}
            <div
              style={{
                width: 64,
                height: 64,
                border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                boxShadow: isActive ? 'var(--glow-accent), 2px 2px 0 #000' : '2px 2px 0 #000',
                background: 'var(--surface)',
                overflow: 'hidden',
                imageRendering: 'pixelated',
                transition: 'all 200ms',
              }}
            >
              <Image
                src={u.avatarUrl}
                alt={u.displayName}
                width={64}
                height={64}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/avatars/default.png';
                }}
              />
            </div>

            {/* Name */}
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                letterSpacing: '0.05em',
                transition: 'color 200ms',
              }}
            >
              {u.displayName.toUpperCase()}
              {u.uid === currentUserUid ? ' ▶' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
