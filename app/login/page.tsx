'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/today');
  }, [user, loading, router]);

  async function handleGoogle() {
    setError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace('/today');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setError('Sign in failed. Try again.');
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
      {/* Scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      <div className="relative z-20 w-full max-w-sm space-y-8 text-center">
        {/* Title block */}
        <div className="space-y-3">
          <h1
            style={{
              ...pixelFont,
              fontSize: '28px',
              color: 'var(--accent)',
              lineHeight: 1.4,
              textShadow: 'var(--glow-accent)',
            }}
          >
            75
          </h1>
          <h2
            style={{
              ...pixelFont,
              fontSize: '14px',
              color: 'var(--accent)',
              textShadow: 'var(--glow-accent)',
            }}
          >
            HARD
          </h2>
          <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
            TRACKER
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '2px solid var(--border)' }} />

        {/* Google button */}
        <div className="space-y-3">
          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full py-4 flex items-center justify-center gap-3 cursor-pointer transition-all duration-150 active:translate-y-px disabled:opacity-50"
            style={{
              border: '2px solid var(--border)',
              boxShadow: '3px 3px 0 #000',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span style={{ ...pixelFont, fontSize: '8px' }}>
              {submitting ? 'SIGNING IN...' : 'SIGN IN WITH GOOGLE'}
            </span>
          </button>

          {error && (
            <p
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '7px',
                color: 'var(--red)',
                background: 'var(--red-light)',
                border: '2px solid var(--red)',
                padding: '10px',
                lineHeight: 2,
              }}
            >
              {error}
            </p>
          )}
        </div>

        <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', lineHeight: 2.5 }}>
          SIGN IN TO TRACK YOUR CHALLENGE
        </p>
      </div>
    </div>
  );
}
