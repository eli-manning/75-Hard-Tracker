'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, ListTodo, CalendarDays } from 'lucide-react';

const NAV = [
  { href: '/today', label: 'TODAY', Icon: Sun },
  { href: '/tasks', label: 'TASKS', Icon: ListTodo },
  { href: '/history', label: 'HISTORY', Icon: CalendarDays },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex z-30"
      style={{
        background: 'var(--surface)',
        borderTop: '2px solid var(--border)',
        boxShadow: '0 -4px 0 #000',
        maxWidth: 480,
        margin: '0 auto',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
      }}
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 cursor-pointer transition-all duration-150"
            style={{
              background: active ? 'var(--accent-light)' : 'transparent',
              borderRight: '1px solid var(--border)',
            }}
          >
            <Icon
              size={20}
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                filter: active ? 'drop-shadow(0 0 4px var(--accent))' : 'none',
              }}
            />
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
