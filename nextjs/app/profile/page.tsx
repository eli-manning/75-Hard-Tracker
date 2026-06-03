'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToProfile, updateUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { getAvatarUrl, generateSeed, hasCustomAvatar } from '@/lib/avatar';
import { invalidate, getSessionCached } from '@/lib/cache';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Edit2, Check, ChevronLeft, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function ProfileInner({ currentUser }: { currentUser: UserProfile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(currentUser);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState(profile.challengeStartDate);
  const [saving, setSaving] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // force re-render of Image on randomize

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  async function handleSaveName() {
    const trimmed = nameInput.trim().slice(0, 100);
    if (!trimmed || trimmed === profile.displayName) { setEditingName(false); return; }
    setSaving(true);
    await updateUserProfile(profile.uid, { displayName: trimmed });
    invalidate('all-users');
    invalidate(`profile-${profile.uid}`);
    setSaving(false);
    setEditingName(false);
    setProfile((p) => ({ ...p, displayName: trimmed }));
  }

  async function handleSaveStart() {
    if (!startInput || startInput === profile.challengeStartDate) { setEditingStart(false); return; }
    setSaving(true);
    await updateUserProfile(profile.uid, { challengeStartDate: startInput });
    invalidate(`profile-${profile.uid}`);
    setSaving(false);
    setEditingStart(false);
    setProfile((p) => ({ ...p, challengeStartDate: startInput }));
  }

  async function handleRandomize() {
    setRandomizing(true);
    const seed = generateSeed();
    await updateUserProfile(profile.uid, { dicebearSeed: seed });
    invalidate(`profile-${profile.uid}`);
    setProfile((p) => ({ ...p, dicebearSeed: seed }));
    setAvatarKey((k) => k + 1);
    setRandomizing(false);
  }

  const isCustom = hasCustomAvatar(profile);
  const daysSinceStart = profile.challengeStartDate
    ? Math.floor((Date.now() - parseISO(profile.challengeStartDate).getTime()) / 86400000) + 1
    : 0;
  const notStarted = daysSinceStart <= 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="px-4 pt-6 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
            <ChevronLeft size={20} color="var(--text)" />
          </button>
          <h1 style={{ ...pixelFont, fontSize: '12px', color: 'var(--accent)' }}>PROFILE</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div style={{
            width: 120, height: 120,
            border: '3px solid var(--accent)',
            boxShadow: 'var(--glow-accent), 4px 4px 0 #000',
            overflow: 'hidden',
            imageRendering: 'pixelated',
          }}>
            <Image
              key={avatarKey}
              src={getAvatarUrl(profile)}
              alt={profile.displayName}
              width={120}
              height={120}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }}
            />
          </div>

          {!isCustom && (
            <button
              onClick={handleRandomize}
              disabled={randomizing}
              className="flex items-center gap-2 cursor-pointer transition-all duration-150 active:translate-y-px disabled:opacity-50"
              style={{
                ...pixelFont,
                fontSize: '7px',
                padding: '8px 14px',
                border: '2px solid var(--border)',
                boxShadow: '2px 2px 0 #000',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              <RefreshCw size={12} style={{ flexShrink: 0 }} />
              {randomizing ? 'RANDOMIZING...' : 'RANDOMIZE'}
            </button>
          )}
        </div>

        {/* Name */}
        <div className="mb-5 p-4" style={{ background: 'var(--surface)', border: '2px solid var(--border)', boxShadow: '2px 2px 0 #000' }}>
          <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginBottom: 8 }}>DISPLAY NAME</p>
          {editingName ? (
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
                maxLength={100}
                className="flex-1 px-2 py-1 min-w-0"
                style={{ ...vt323, fontSize: '22px', border: '2px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
              />
              <button onClick={handleSaveName} disabled={saving} className="cursor-pointer p-1">
                <Check size={18} color="var(--green)" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span style={{ ...vt323, fontSize: '26px', color: 'var(--text)' }}>{profile.displayName}</span>
              <button onClick={() => setEditingName(true)} className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                <Edit2 size={14} color="var(--text)" />
              </button>
            </div>
          )}
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>{profile.email}</p>
        </div>

        {/* Challenge start date */}
        <div className="mb-5 p-4" style={{ background: 'var(--surface)', border: '2px solid var(--border)', boxShadow: '2px 2px 0 #000' }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>CHALLENGE START DATE</p>
            {!editingStart && (
              <button onClick={() => setEditingStart(true)} className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                <Edit2 size={12} color="var(--text)" />
              </button>
            )}
          </div>
          {editingStart ? (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="flex-1 px-2 py-1"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', border: '2px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
              />
              <button
                onClick={handleSaveStart}
                disabled={saving}
                style={{ ...pixelFont, fontSize: '7px', padding: '6px 10px', border: '2px solid var(--accent)', background: 'var(--accent-light)', color: 'var(--accent)', cursor: 'pointer' }}
              >
                SAVE
              </button>
              <button
                onClick={() => { setEditingStart(false); setStartInput(profile.challengeStartDate); }}
                style={{ ...pixelFont, fontSize: '7px', padding: '6px 10px', border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                CANCEL
              </button>
            </div>
          ) : (
            <p style={{ ...vt323, fontSize: '22px', color: 'var(--text)' }}>
              {profile.challengeStartDate ? format(parseISO(profile.challengeStartDate), 'MMM d, yyyy') : '—'}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'CURRENT STREAK', value: `${profile.currentStreak ?? 0} DAYS` },
            { label: 'LONGEST STREAK', value: `${profile.longestStreak ?? 0} DAYS` },
            { label: 'DAY #', value: notStarted ? '—' : String(daysSinceStart) },
            { label: 'STARTED', value: profile.challengeStartDate ? format(parseISO(profile.challengeStartDate), 'MMM d') : '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-3"
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                boxShadow: '2px 2px 0 var(--border)',
              }}
            >
              <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
              <p style={{ ...pixelFont, fontSize: '12px', color: 'var(--accent)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('75hard-profile'));

  useEffect(() => {
    if (!user) return;
    return subscribeToProfile(user.uid, setProfile);
  }, [user]);

  return (
    <AuthGuard>
      {profile ? <ProfileInner currentUser={profile} /> : <LoadingScreen />}
    </AuthGuard>
  );
}
