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
        borderTop: '2px solid var(--text)',
        boxShadow: '0 -2px 0 var(--text)',
      }}
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all"
            style={{
              background: active ? 'var(--accent-light)' : 'transparent',
              borderRight: '1px solid var(--border)',
            }}
          >
            <Icon
              size={20}
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
            />
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '7px',
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
