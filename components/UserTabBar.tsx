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
    <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
      {users.map((u) => {
        const isActive = u.uid === activeUid;
        return (
          <button
            key={u.uid}
            onClick={() => onSelectUser(u.uid)}
            className="flex items-center gap-2 px-3 py-2 shrink-0 transition-all"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: '9px',
              border: '2px solid var(--text)',
              boxShadow: isActive ? '2px 2px 0 var(--text)' : '1px 1px 0 var(--text)',
              background: isActive ? 'var(--accent)' : 'var(--surface)',
              color: isActive ? '#fff' : 'var(--text)',
            }}
          >
            <div
              className="w-7 h-7 shrink-0 overflow-hidden"
              style={{ border: '1px solid var(--border)', imageRendering: 'pixelated' }}
            >
              <Image
                src={u.avatarUrl}
                alt={u.displayName}
                width={28}
                height={28}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/avatars/default.png';
                }}
              />
            </div>
            {u.displayName.toUpperCase()}
            {u.uid === currentUserUid && (
              <span style={{ fontSize: '7px', opacity: 0.8 }}>YOU</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
