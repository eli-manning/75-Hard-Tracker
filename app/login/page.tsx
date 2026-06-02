'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, sendPasswordReset } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';

type Mode = 'login' | 'signup';

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'No account with that email.',
  'auth/email-already-in-use': 'Email already registered. Sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
};

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

  useEffect(() => {
    if (!authLoading && user) router.replace('/today');
  }, [user, authLoading, router]);

  if (authLoading) return <LoadingScreen />;
  if (user) return <LoadingScreen />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) { setError('Enter your name.'); setSubmitting(false); return; }
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      router.replace('/today');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(ERROR_MAP[code] ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(ERROR_MAP[code] ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    border: '2px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
      }} />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 style={{ ...pixelFont, fontSize: '24px', color: 'var(--accent)', textShadow: 'var(--glow-accent)', lineHeight: 1.5 }}>
            75 HARD
          </h1>
          <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
            TRACKER
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          boxShadow: '4px 4px 0 #000',
        }}>

          {resetMode ? (
            /* ── Forgot Password ── */
            <div>
              <div className="flex items-center p-4" style={{ borderBottom: '2px solid var(--border)' }}>
                <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--accent)' }}>RESET PASSWORD</span>
              </div>
              {resetSent ? (
                <div className="p-5 space-y-4">
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    color: 'var(--green)',
                    background: 'var(--green-light)',
                    border: '2px solid var(--green)',
                    padding: '10px',
                    lineHeight: 1.5,
                  }}>
                    Check your email for a reset link.
                  </p>
                  <button
                    onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                    className="w-full py-3 cursor-pointer"
                    style={{
                      ...pixelFont,
                      fontSize: '7px',
                      border: '2px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  >
                    BACK TO SIGN IN
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="p-5 space-y-4">
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Enter your email and we&apos;ll send a reset link.
                  </p>
                  <div className="space-y-1">
                    <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>EMAIL</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  {error && (
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      color: 'var(--red)',
                      background: 'var(--red-light)',
                      border: '2px solid var(--red)',
                      padding: '10px',
                      lineHeight: 1.5,
                    }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 cursor-pointer transition-all duration-150 active:translate-y-px disabled:opacity-50"
                    style={{
                      ...pixelFont,
                      fontSize: '9px',
                      border: '2px solid var(--accent)',
                      boxShadow: '3px 3px 0 #000',
                      background: 'var(--accent)',
                      color: '#fff',
                    }}
                  >
                    {submitting ? 'SENDING...' : 'SEND RESET LINK'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetMode(false); setError(''); }}
                    className="w-full py-2 cursor-pointer"
                    style={{
                      ...pixelFont,
                      fontSize: '6px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                    }}
                  >
                    BACK TO SIGN IN
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ── Login / Signup ── */
            <div>
              {/* Mode tabs */}
              <div className="flex" style={{ borderBottom: '2px solid var(--border)' }}>
                {(['login', 'signup'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); }}
                    className="flex-1 py-3 cursor-pointer transition-all duration-150"
                    style={{
                      ...pixelFont,
                      fontSize: '7px',
                      background: mode === m ? 'var(--accent-light)' : 'transparent',
                      color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                      borderRight: m === 'login' ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {m === 'login' ? 'SIGN IN' : 'SIGN UP'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-1">
                    <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>NAME</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="First Last"
                      required
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>EMAIL</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                <div className="space-y-1">
                  <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setResetMode(true); setError(''); }}
                      className="cursor-pointer"
                      style={{
                        ...pixelFont,
                        fontSize: '6px',
                        color: 'var(--text-muted)',
                        background: 'none',
                        border: 'none',
                        padding: '4px 0',
                        display: 'block',
                      }}
                    >
                      FORGOT PASSWORD?
                    </button>
                  )}
                </div>

                {error && (
                  <p style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    color: 'var(--red)',
                    background: 'var(--red-light)',
                    border: '2px solid var(--red)',
                    padding: '10px',
                    lineHeight: 1.5,
                  }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 cursor-pointer transition-all duration-150 active:translate-y-px disabled:opacity-50"
                  style={{
                    ...pixelFont,
                    fontSize: '9px',
                    border: '2px solid var(--accent)',
                    boxShadow: '3px 3px 0 #000',
                    background: 'var(--accent)',
                    color: '#fff',
                  }}
                >
                  {submitting ? 'LOADING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
