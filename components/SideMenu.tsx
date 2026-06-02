'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import {
  updateUserProfile,
  getUserProfile,
  getAllUsers,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatar';
import { LogOut, X, Calendar, Target, Edit2, Check, UserPlus, UserMinus, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getCached, invalidate } from '@/lib/cache';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
  onRequestsSeen?: () => void;
}

export function SideMenu({ open, onClose, profile, onProfileUpdate, onRequestsSeen }: SideMenuProps) {
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState(profile.challengeStartDate);
  const [saving, setSaving] = useState(false);

  // Seed from in-memory cache so the list is instant if the page already fetched users
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => getCached<UserProfile[]>('all-users') ?? []);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [friendsActionUid, setFriendsActionUid] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState('');

  // Always-current refs for callbacks so the open-menu effect doesn't need them as deps
  // (adding them would cause refetches on every parent re-render since they're inline functions)
  const onProfileUpdateRef = useRef(onProfileUpdate);
  onProfileUpdateRef.current = onProfileUpdate;
  const onRequestsSeenRef = useRef(onRequestsSeen);
  onRequestsSeenRef.current = onRequestsSeen;

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

  // Load friends data when menu opens
  useEffect(() => {
    if (!open) { setSentRequests(new Set()); setFriendSearch(''); return; }

    // Always fetch fresh profile — another user may have accepted our request and written
    // to our friends array in Firestore. That update lives in their browser's cache, not ours,
    // so we must bypass our local cache to see it.
    invalidate(`profile-${profile.uid}`);
    getUserProfile(profile.uid).then((fresh) => {
      if (fresh) onProfileUpdateRef.current(fresh);
    }).catch(() => {});

    // Users: usually cached and instant — refresh in background without blocking
    invalidate('all-users');
    getAllUsers().then(setAllUsers).catch(() => {});

    // Pending requests: always a network call, show a small spinner just for that section
    setRequestsLoading(true);
    getPendingRequests(profile.uid)
      .then((reqs) => { setPendingRequests(reqs); if (reqs.length === 0) onRequestsSeenRef.current?.(); })
      .catch(() => setPendingRequests([]))
      .finally(() => setRequestsLoading(false));
  }, [open, profile.uid]);

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

  async function handleSendRequest(toUid: string) {
    setFriendsActionUid(toUid);
    const autoAccepted = await sendFriendRequest(profile.uid, toUid);
    if (autoAccepted) {
      // Both people had pending requests — we're now friends
      onProfileUpdate({ ...profile, friends: [...(profile.friends ?? []), toUid] });
    } else {
      setSentRequests((prev) => new Set(Array.from(prev).concat(toUid)));
    }
    setFriendsActionUid(null);
  }

  async function handleAccept(fromUid: string) {
    setFriendsActionUid(fromUid);
    await acceptFriendRequest(profile.uid, fromUid);
    const newFriends = [...(profile.friends ?? []), fromUid];
    onProfileUpdate({ ...profile, friends: newFriends });
    setPendingRequests((prev) => prev.filter((uid) => uid !== fromUid));
    setFriendsActionUid(null);
  }

  async function handleDecline(fromUid: string) {
    setFriendsActionUid(fromUid);
    await declineFriendRequest(profile.uid, fromUid);
    setPendingRequests((prev) => prev.filter((uid) => uid !== fromUid));
    setFriendsActionUid(null);
  }

  async function handleRemoveFriend(friendUid: string) {
    setFriendsActionUid(friendUid);
    await removeFriend(profile.uid, friendUid);
    const newFriends = (profile.friends ?? []).filter((uid) => uid !== friendUid);
    onProfileUpdate({ ...profile, friends: newFriends });
    setFriendsActionUid(null);
  }

  const daysSinceStart = profile.challengeStartDate
    ? Math.floor((Date.now() - parseISO(profile.challengeStartDate).getTime()) / 86400000) + 1
    : 0;
  const notStarted = daysSinceStart <= 0;

  const friendUids = new Set(profile.friends ?? []);
  const friends = allUsers.filter((u) => friendUids.has(u.uid));
  const requesters = allUsers.filter((u) => pendingRequests.includes(u.uid));
  const addCandidates = allUsers.filter(
    (u) => u.uid !== profile.uid && !friendUids.has(u.uid) && !pendingRequests.includes(u.uid)
  );

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
        {/* Header — fixed, not scrolled */}
        <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
          <span style={{ ...pixelFont, fontSize: '8px', color: 'var(--accent)' }}>PROFILE</span>
          <button onClick={onClose} className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
            <X size={18} color="var(--text)" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Avatar + name */}
          <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { router.push('/profile'); onClose(); }}
                style={{
                  width: 56, height: 56, border: '2px solid var(--accent)',
                  boxShadow: 'var(--glow-accent)', overflow: 'hidden', flexShrink: 0,
                  padding: 0, cursor: 'pointer', background: 'none',
                }}
              >
                <Image src={getAvatarUrl(profile)} alt={profile.displayName} width={56} height={56}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
              </button>
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
          <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
            <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>STATS</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: 'CURRENT', value: `${profile.currentStreak ?? 0}d`, color: 'var(--accent)' },
                { label: 'LONGEST', value: `${profile.longestStreak ?? 0}d`, color: 'var(--green)' },
                { label: 'DAY #', value: notStarted ? '—' : String(daysSinceStart), color: notStarted ? 'var(--text-muted)' : 'var(--text)' },
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
          <div className="p-4 space-y-2 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
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

          {/* Friends */}
          <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Users size={14} color="var(--text-muted)" />
              <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>FRIENDS</span>
              {!requestsLoading && requesters.length > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: 'var(--red)', color: '#fff',
                  fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                  paddingInline: 4,
                }}>
                  {requesters.length}
                </span>
              )}
            </div>

            <div className="space-y-3">

              {/* Pending incoming requests */}
              {requestsLoading ? (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>Checking requests…</p>
              ) : requesters.length > 0 ? (
                <div className="space-y-2">
                  <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--accent)' }}>REQUESTS</p>
                  {requesters.map((u) => (
                    <div key={u.uid} className="flex items-center gap-3 py-1">
                      <div style={{ width: 40, height: 40, border: '2px solid var(--accent)', overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={u.avatarUrl} alt={u.displayName} width={40} height={40}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.displayName}
                      </span>
                      <button
                        onClick={() => { handleAccept(u.uid); onRequestsSeen?.(); }}
                        disabled={friendsActionUid === u.uid}
                        className="cursor-pointer"
                        style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 700, padding: '4px 10px', border: '2px solid var(--green)', background: 'var(--green-light)', color: 'var(--green)', opacity: friendsActionUid === u.uid ? 0.5 : 1 }}
                      >✓</button>
                      <button
                        onClick={() => handleDecline(u.uid)}
                        disabled={friendsActionUid === u.uid}
                        className="cursor-pointer"
                        style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 700, padding: '4px 10px', border: '2px solid var(--red)', background: 'var(--red-light)', color: 'var(--red)', opacity: friendsActionUid === u.uid ? 0.5 : 1 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Current friends */}
              {friends.length > 0 && (
                <div className="space-y-2">
                  <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>YOUR FRIENDS</p>
                  {friends.map((u) => (
                    <div key={u.uid} className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={u.avatarUrl} alt={u.displayName} width={28} height={28}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.displayName}
                      </span>
                      <button
                        onClick={() => handleRemoveFriend(u.uid)}
                        disabled={friendsActionUid === u.uid}
                        className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                        title="Remove friend"
                      >
                        <UserMinus size={14} color="var(--red)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add friends — search (always shown so users can search even before users load) */}
              <div className="space-y-2">
                <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>ADD FRIENDS</p>
                <input
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  style={{
                    width: '100%',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    padding: '6px 8px',
                    border: '2px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                />
                {(() => {
                  const q = friendSearch.trim().toLowerCase();
                  if (!q) return null;
                  const results = addCandidates.filter(
                    (u) =>
                      u.displayName.toLowerCase().includes(q) ||
                      u.email.toLowerCase().includes(q)
                  );
                  if (results.length === 0) {
                    return (
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>
                        No users found.
                      </p>
                    );
                  }
                  return results.map((u) => {
                    const sent = sentRequests.has(u.uid);
                    return (
                      <div key={u.uid} className="flex items-center gap-2">
                        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                          <Image src={u.avatarUrl} alt={u.displayName} width={28} height={28}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.displayName}
                          </p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.email}
                          </p>
                        </div>
                        {sent ? (
                          <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>SENT</span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(u.uid)}
                            disabled={friendsActionUid === u.uid}
                            className="cursor-pointer"
                            title="Send friend request"
                          >
                            <UserPlus size={14} color="var(--accent)" style={{ opacity: friendsActionUid === u.uid ? 0.5 : 1 }} />
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

            </div>
          </div>

          {/* Challenge goal reminder */}
          <div className="p-4 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
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
          <div className="p-4 mt-auto shrink-0">
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
              <a href="/privacy" style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', textDecoration: 'none' }}>PRIVACY</a>
              <span style={{ color: 'var(--border)' }}>|</span>
              <a href="/terms" style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', textDecoration: 'none' }}>TERMS</a>
            </div>
          </div>

        </div>{/* end scrollable content */}
      </div>
    </>
  );
}
