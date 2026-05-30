'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/today');
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      router.replace('/today');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Wrong email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setError('Email already in use. Try signing in.');
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm p-6 space-y-6"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--text)',
          boxShadow: '4px 4px 0 var(--text)',
        }}
      >
        {/* Title */}
        <div className="text-center space-y-1">
          <h1
            style={{
              ...pixelFont,
              fontSize: '14px',
              color: 'var(--accent)',
              lineHeight: 1.6,
            }}
          >
            75 HARD
          </h1>
          <p style={{ ...pixelFont, fontSize: '8px', color: 'var(--text-muted)' }}>
            TRACKER
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2 transition-all"
              style={{
                ...pixelFont,
                fontSize: '8px',
                border: '2px solid var(--text)',
                boxShadow: mode === m ? '2px 2px 0 var(--text)' : 'none',
                background: mode === m ? 'var(--accent)' : 'var(--surface)',
                color: mode === m ? '#fff' : 'var(--text)',
              }}
            >
              {m === 'login' ? 'SIGN IN' : 'SIGN UP'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>
                NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Eli"
                className="w-full px-3 py-2 bg-white"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  border: '2px solid var(--border)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--text)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          )}

          <div className="space-y-1">
            <label style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 bg-white"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                border: '2px solid var(--border)',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--text)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div className="space-y-1">
            <label style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-white"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                border: '2px solid var(--border)',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--text)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && (
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                color: 'var(--red)',
                border: '1px solid var(--red-light)',
                background: 'var(--red-light)',
                padding: '8px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 transition-all active:translate-y-px disabled:opacity-60"
            style={{
              ...pixelFont,
              fontSize: '10px',
              border: '2px solid var(--text)',
              boxShadow: '3px 3px 0 var(--text)',
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            {submitting ? 'LOADING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  );
}
