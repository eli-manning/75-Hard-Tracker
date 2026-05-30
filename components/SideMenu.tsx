'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { updateUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { LogOut, X, Calendar, Target, Edit2, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { invalidate } from '@/lib/cache';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
}

export function SideMenu({ open, onClose, profile, onProfileUpdate }: SideMenuProps) {
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState(profile.challengeStartDate);
  const [saving, setSaving] = useState(false);

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  // Sync inputs when profile prop changes (e.g. after save propagates back up)
  useEffect(() => {
    if (!editingName) setNameInput(profile.displayName);
    if (!editingStart) setStartInput(profile.challengeStartDate);
  }, [profile.displayName, profile.challengeStartDate, editingName, editingStart]);

  // Lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleSaveName() {
    if (!nameInput.trim() || nameInput === profile.displayName) { setEditingName(false); return; }
    setSaving(true);
    const displayName = nameInput.trim();
    await updateUserProfile(profile.uid, { displayName });
    invalidate('all-users');
    setSaving(false);
    setEditingName(false);
    onProfileUpdate({ ...profile, displayName });
  }

  async function handleSaveStart() {
    if (!startInput || startInput === profile.challengeStartDate) { setEditingStart(false); return; }
    setSaving(true);
    await updateUserProfile(profile.uid, { challengeStartDate: startInput });
    invalidate(`profile-${profile.uid}`);
    setSaving(false);
    setEditingStart(false);
    onProfileUpdate({ ...profile, challengeStartDate: startInput });
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const daysSinceStart = profile.challengeStartDate
    ? Math.max(1, Math.floor((Date.now() - parseISO(profile.challengeStartDate).getTime()) / 86400000) + 1)
    : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.7)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 280,
          background: 'var(--surface)',
          borderLeft: '2px solid var(--border)',
          boxShadow: open ? '-4px 0 0 #000' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '2px solid var(--border)' }}>
          <span style={{ ...pixelFont, fontSize: '8px', color: 'var(--accent)' }}>PROFILE</span>
          <button onClick={onClose} className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
            <X size={18} color="var(--text)" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="p-4 space-y-3" style={{ borderBottom: '2px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 56, height: 56, border: '2px solid var(--accent)',
              boxShadow: 'var(--glow-accent)', overflow: 'hidden', flexShrink: 0,
            }}>
              <Image src={profile.avatarUrl} alt={profile.displayName} width={56} height={56}
                className="w-full h-full object-cover object-top"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-1">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                    autoFocus
                    className="flex-1 px-2 py-1 min-w-0"
                    style={{ ...vt323, fontSize: '20px', border: '2px solid var(--accent)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none' }}
                  />
                  <button onClick={handleSaveName} disabled={saving} className="cursor-pointer p-1">
                    <Check size={16} color="var(--green)" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span style={{ ...vt323, fontSize: '22px', color: 'var(--text)' }}>{profile.displayName}</span>
                  <button onClick={() => setEditingName(true)} className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                    <Edit2 size={12} color="var(--text)" />
                  </button>
                </div>
              )}
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                {profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3" style={{ borderBottom: '2px solid var(--border)' }}>
          <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>STATS</span>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'CURRENT', value: `${profile.currentStreak ?? 0}d`, color: 'var(--accent)' },
              { label: 'LONGEST', value: `${profile.longestStreak ?? 0}d`, color: 'var(--green)' },
              { label: 'DAY #', value: String(daysSinceStart), color: 'var(--text)' },
              { label: 'STARTED', value: profile.challengeStartDate ? format(parseISO(profile.challengeStartDate), 'MMM d') : '—', color: 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--surface-2)', border: '2px solid var(--border)', padding: '8px 10px' }}>
                <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>{label}</p>
                <p style={{ ...pixelFont, fontSize: '12px', color, marginTop: 4 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Challenge start date edit */}
        <div className="p-4 space-y-2" style={{ borderBottom: '2px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={14} color="var(--text-muted)" />
              <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>START DATE</span>
            </div>
            {!editingStart && (
              <button onClick={() => setEditingStart(true)} className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                <Edit2 size={12} color="var(--text)" />
              </button>
            )}
          </div>
          {editingStart ? (
            <div className="flex gap-2 items-center">
              <input type="date" value={startInput} onChange={(e) => setStartInput(e.target.value)}
                className="flex-1 px-2 py-1"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', border: '2px solid var(--accent)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none' }} />
              <button onClick={handleSaveStart} disabled={saving}
                style={{ ...pixelFont, fontSize: '7px', padding: '4px 8px', border: '2px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer' }}>
                SAVE
              </button>
            </div>
          ) : (
            <p style={{ fontFamily: '"VT323", monospace', fontSize: '20px', color: 'var(--text)' }}>
              {profile.challengeStartDate ? format(parseISO(profile.challengeStartDate), 'MMM d, yyyy') : '—'}
            </p>
          )}
        </div>

        {/* Challenge goal reminder */}
        <div className="p-4" style={{ borderBottom: '2px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} color="var(--text-muted)" />
            <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>THE RULES</span>
          </div>
          <ul style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
            {['2x 45-min workouts (1 outdoor)', '1 gallon of water', 'Follow your diet', 'Read 10 pages', 'Progress photo'].map((r) => (
              <li key={r} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--accent)' }}>▸</span> {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Sign out */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 cursor-pointer transition-all duration-150 active:translate-y-px"
            style={{
              ...pixelFont, fontSize: '8px',
              border: '2px solid var(--border)',
              boxShadow: '2px 2px 0 #000',
              background: 'var(--surface-2)',
              color: 'var(--text-muted)',
            }}
          >
            <LogOut size={14} />
            SIGN OUT
          </button>
        </div>
      </div>
    </>
  );
}
