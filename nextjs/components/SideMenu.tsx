'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import {
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
import { LogOut, X, ChevronRight, UserPlus, UserMinus, Users } from 'lucide-react';
import { InstallPrompt } from '@/components/InstallPrompt';
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

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => getCached<UserProfile[]>('all-users') ?? []);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [friendsActionUid, setFriendsActionUid] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState('');

  const onProfileUpdateRef = useRef(onProfileUpdate);
  onProfileUpdateRef.current = onProfileUpdate;
  const onRequestsSeenRef = useRef(onRequestsSeen);
  onRequestsSeenRef.current = onRequestsSeen;

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) { setSentRequests(new Set()); setFriendSearch(''); return; }

    invalidate(`profile-${profile.uid}`);
    getUserProfile(profile.uid).then((fresh) => {
      if (fresh) onProfileUpdateRef.current(fresh);
    }).catch(() => {});

    invalidate('all-users');
    getAllUsers().then(setAllUsers).catch(() => {});

    setRequestsLoading(true);
    getPendingRequests(profile.uid)
      .then((reqs) => { setPendingRequests(reqs); if (reqs.length === 0) onRequestsSeenRef.current?.(); })
      .catch(() => setPendingRequests([]))
      .finally(() => setRequestsLoading(false));
  }, [open, profile.uid]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  async function handleSendRequest(toUid: string) {
    setFriendsActionUid(toUid);
    const autoAccepted = await sendFriendRequest(profile.uid, toUid);
    if (autoAccepted) {
      onProfileUpdate({ ...profile, friends: [...(profile.friends ?? []), toUid] });
    } else {
      setSentRequests((prev) => new Set(Array.from(prev).concat(toUid)));
    }
    setFriendsActionUid(null);
  }

  async function handleAccept(fromUid: string) {
    setFriendsActionUid(fromUid);
    await acceptFriendRequest(profile.uid, fromUid);
    onProfileUpdate({ ...profile, friends: [...(profile.friends ?? []), fromUid] });
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
    onProfileUpdate({ ...profile, friends: (profile.friends ?? []).filter((uid) => uid !== friendUid) });
    setFriendsActionUid(null);
  }

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
        style={{ background: 'rgba(0,0,0,0.7)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
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
        <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: '2px solid var(--border)' }}>
          <span style={{ ...pixelFont, fontSize: '8px', color: 'var(--accent)' }}>MENU</span>
          <button onClick={onClose} className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
            <X size={18} color="var(--text)" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Profile link — prominent CTA */}
          <button
            onClick={() => { router.push('/profile'); onClose(); }}
            className="flex items-center gap-3 p-4 cursor-pointer transition-all hover:opacity-80 active:opacity-60 shrink-0"
            style={{ borderBottom: '2px solid var(--border)', background: 'var(--surface)', textAlign: 'left' }}
          >
            <div style={{
              width: 48, height: 48, border: '2px solid var(--accent)',
              boxShadow: 'var(--glow-accent)', overflow: 'hidden', flexShrink: 0,
            }}>
              <Image src={getAvatarUrl(profile)} alt={profile.displayName} width={48} height={48}
                className="w-full h-full object-cover object-top"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ ...vt323, fontSize: '22px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.displayName}
              </div>
              <div style={{ ...pixelFont, fontSize: '6px', color: 'var(--accent)', marginTop: 2 }}>VIEW PROFILE</div>
            </div>
            <ChevronRight size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          </button>

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

            {/* Incoming requests */}
            {requestsLoading ? (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>Checking requests…</p>
            ) : requesters.length > 0 && (
              <div className="space-y-2">
                <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--accent)' }}>REQUESTS</p>
                {requesters.map((u) => (
                  <div key={u.uid} className="flex items-center gap-3 py-1">
                    <div style={{ width: 36, height: 36, border: '2px solid var(--accent)', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={getAvatarUrl(u)} alt={u.displayName} width={36} height={36}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName}
                    </span>
                    <button onClick={() => { handleAccept(u.uid); onRequestsSeen?.(); }} disabled={friendsActionUid === u.uid} className="cursor-pointer"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, padding: '3px 9px', border: '2px solid var(--green)', background: 'var(--green-light)', color: 'var(--green)', opacity: friendsActionUid === u.uid ? 0.5 : 1 }}>✓</button>
                    <button onClick={() => handleDecline(u.uid)} disabled={friendsActionUid === u.uid} className="cursor-pointer"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, padding: '3px 9px', border: '2px solid var(--red)', background: 'var(--red-light)', color: 'var(--red)', opacity: friendsActionUid === u.uid ? 0.5 : 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Current friends */}
            {friends.length > 0 && (
              <div className="space-y-2">
                <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>YOUR FRIENDS</p>
                {friends.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2">
                    <div style={{ width: 28, height: 28, border: '2px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={getAvatarUrl(u)} alt={u.displayName} width={28} height={28}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName}
                    </span>
                    <button onClick={() => handleRemoveFriend(u.uid)} disabled={friendsActionUid === u.uid}
                      className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity" title="Remove friend">
                      <UserMinus size={14} color="var(--red)" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add friends */}
            <div className="space-y-2">
              <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>ADD FRIENDS</p>
              <input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '12px', padding: '6px 8px', border: '2px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none' }}
              />
              {(() => {
                const q = friendSearch.trim().toLowerCase();
                if (!q) return null;
                const results = addCandidates.filter(
                  (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                );
                if (results.length === 0) return (
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-muted)' }}>No users found.</p>
                );
                return results.map((u) => {
                  const sent = sentRequests.has(u.uid);
                  return (
                    <div key={u.uid} className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                        <Image src={getAvatarUrl(u)} alt={u.displayName} width={28} height={28}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName}</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                      </div>
                      {sent ? (
                        <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>SENT</span>
                      ) : (
                        <button onClick={() => handleSendRequest(u.uid)} disabled={friendsActionUid === u.uid} className="cursor-pointer" title="Send friend request">
                          <UserPlus size={14} color="var(--accent)" style={{ opacity: friendsActionUid === u.uid ? 0.5 : 1 }} />
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Install prompt */}
          <div className="px-4 py-3 shrink-0" >
            <InstallPrompt compact />
          </div>

          {/* Sign out + legal */}
          <div className="p-4 mt-auto shrink-0">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 cursor-pointer transition-all active:translate-y-px"
              style={{ ...pixelFont, fontSize: '8px', border: '2px solid var(--border)', boxShadow: '2px 2px 0 #000', background: 'var(--surface-2)', color: 'var(--text-muted)' }}
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

        </div>
      </div>
    </>
  );
}
