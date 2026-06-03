'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  const pixel = { fontFamily: '"Press Start 2P", monospace' };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 448,
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        boxShadow: '4px 4px 0 #000',
        padding: '16px',
        zIndex: 100,
      }}
    >
      <p style={{ ...pixel, fontSize: '7px', color: 'var(--accent)', marginBottom: 8 }}>COOKIES</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
        We use cookies for authentication (Firebase) and to keep you signed in.
        See our{' '}
        <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={accept}
          style={{
            ...pixel, fontSize: '7px',
            padding: '8px 12px',
            background: 'var(--accent)',
            color: '#000',
            border: '2px solid #000',
            boxShadow: '2px 2px 0 #000',
            cursor: 'pointer',
          }}
        >
          ACCEPT
        </button>
        <button
          onClick={decline}
          style={{
            ...pixel, fontSize: '7px',
            padding: '8px 12px',
            background: 'var(--surface-2)',
            color: 'var(--text-muted)',
            border: '2px solid var(--border)',
            boxShadow: '2px 2px 0 #000',
            cursor: 'pointer',
          }}
        >
          DECLINE
        </button>
      </div>
    </div>
  );
}
