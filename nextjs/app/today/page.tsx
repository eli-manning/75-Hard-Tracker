'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useDayData } from '@/hooks/useDayData';
import { useCustomTasks } from '@/hooks/useCustomTasks';
import { useMinDuration } from '@/hooks/useMinDuration';
import { getUserProfile, getAllUsers, getPendingRequests, getOrCreateDayEntry, getDayHistory } from '@/lib/firestore';
import { getCached, getSessionCached, setSessionCached, clearAll } from '@/lib/cache';
import { UserProfile, DayEntry } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { BottomNav } from '@/components/BottomNav';
import { UserTabBar } from '@/components/UserTabBar';
import { DailyProgress } from '@/components/DailyProgress';
import { ChallengeChecklist } from '@/components/ChallengeChecklist';
import { CustomTaskList } from '@/components/CustomTaskList';
import { StreakBadge } from '@/components/StreakBadge';
import { SideMenu } from '@/components/SideMenu';

const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

function DaySkeleton({ profile }: { profile: UserProfile }) {
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  return (
    <div className="px-4 space-y-6 pt-2 page-enter">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div style={{ ...pixelFont, fontSize: '32px', color: 'var(--accent)', opacity: 0.3 }}>DAY —</div>
            <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginTop: 6 }}>{today}</p>
          </div>
          {profile.currentStreak > 0 && <StreakBadge streak={profile.currentStreak} />}
        </div>
        <div className="h-5 skeleton-pulse" style={{ border: '2px solid var(--border)', background: 'var(--surface)' }} />
      </div>
      <div className="space-y-2">
        <div style={{ ...pixelFont, fontSize: '9px', color: 'var(--text-muted)', marginBottom: 10, opacity: 0.5 }}>CORE TASKS</div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-pulse" style={{
            height: 52, border: '2px solid var(--border)', background: 'var(--surface)',
            animationDelay: `${i * 80}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}

function TodayInner({ currentUser, onProfileUpdate }: { currentUser: UserProfile; onProfileUpdate: (p: UserProfile) => void }) {
  const { users: allUsers } = useAllUsers();
  // Signed-in user always first, then only friends. Memoized so effects don't re-run every render.
  const users = useMemo(() => {
    const friendSet = new Set(currentUser.friends ?? []);
    return [
      ...allUsers.filter((u) => u.uid === currentUser.uid),
      ...allUsers.filter((u) => u.uid !== currentUser.uid && friendSet.has(u.uid)),
    ];
  }, [allUsers, currentUser.uid, currentUser.friends]);
  const [activeUid, setActiveUid] = useState(currentUser.uid);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(currentUser);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    getPendingRequests(currentUser.uid)
      .then((reqs) => setPendingRequestCount(reqs.length))
      .catch(() => {});
  }, [currentUser.uid]);

  const readOnly = activeUid !== currentUser.uid;
  const { dayEntry, loading: dayLoading, update } = useDayData(activeUid, activeProfile.challengeStartDate);
  const { tasks } = useCustomTasks(activeUid);

  // Only enforce the min-duration when switching to a different user tab (no cached data).
  // For your own data (already loaded), show immediately.
  const isTabSwitch = activeUid !== currentUser.uid && profileLoading;
  const showSkeleton = useMinDuration(isTabSwitch || (dayLoading && !dayEntry), 600);

  // Prefetch friend today-entries in the background once the friends list is known.
  // Warms the cache so the first tap on a friend tab is instant.
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    for (const friend of users) {
      if (friend.uid === currentUser.uid || !friend.challengeStartDate) continue;
      const key = `day-${friend.uid}-${today}`;
      if (!getCached<DayEntry>(key)) {
        getOrCreateDayEntry(friend.uid, today, friend.challengeStartDate).catch(() => {});
      }
    }
  }, [users, currentUser.uid]);

  useEffect(() => {
    if (activeUid === currentUser.uid) {
      setActiveProfile(currentUser);
      setProfileError(false);
      return;
    }
    // Use already-loaded allUsers list before touching Firestore
    const found = users.find((u) => u.uid === activeUid);
    if (found) {
      setActiveProfile(found);
      setProfileError(false);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(false);
    getUserProfile(activeUid)
      .then((p) => {
        if (p) setActiveProfile(p);
        else setProfileError(true);
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [activeUid, currentUser, users]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const streak = activeProfile.currentStreak ?? 0;
  // Compute dayNumber live from the profile so start-date changes reflect immediately
  const dayNum = activeProfile.challengeStartDate
    ? differenceInDays(parseISO(todayStr), parseISO(activeProfile.challengeStartDate)) + 1
    : 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        {users.length > 0 ? (
          <UserTabBar users={users} activeUid={activeUid} onSelectUser={setActiveUid} currentUserUid={currentUser.uid} />
        ) : <div />}
        <div className="relative ml-2 shrink-0">
          <button
            onClick={() => setMenuOpen(true)}
            className="cursor-pointer flex flex-col gap-1.5 p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Open menu"
          >
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--text)' }} />
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--text)' }} />
            <span style={{ display: 'block', width: 20, height: 2, background: 'var(--text)' }} />
          </button>
          {pendingRequestCount > 0 && (
            <span
              className="absolute pointer-events-none"
              style={{
                top: 0, right: 0,
                width: 8, height: 8,
                borderRadius: '50%',
                background: 'var(--red)',
                border: '1.5px solid var(--bg)',
              }}
            />
          )}
        </div>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} profile={currentUser} onProfileUpdate={onProfileUpdate} onRequestsSeen={() => setPendingRequestCount(0)} />

      {readOnly && !showSkeleton && (
        <div className="mx-4 mb-2 px-3 py-2 text-center" style={{
          ...pixelFont, fontSize: '6px',
          background: 'var(--surface-2)', border: '2px solid var(--border)', color: 'var(--text-muted)',
        }}>
          VIEWING {activeProfile.displayName.toUpperCase()}&apos;S DAY
        </div>
      )}

      {profileError && (
        <div className="mx-4 mb-4 px-3 py-3 text-center" style={{
          ...pixelFont, fontSize: '7px', background: 'var(--red-light)', border: '2px solid var(--red)', color: 'var(--red)',
        }}>
          FAILED TO LOAD USER DATA
        </div>
      )}

      {showSkeleton ? (
        <DaySkeleton profile={activeProfile} />
      ) : (
        <div className="px-4 space-y-6 page-enter">
          <div className="pt-2 space-y-3">
            {(() => {
              const notStarted = dayNum <= 0;
              const daysUntil = notStarted ? Math.abs(dayNum) + 1 : 0;
              return (
                <div className="flex items-start justify-between">
                  <div>
                    {notStarted ? (
                      <>
                        <h1 style={{ ...pixelFont, fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          STARTS IN
                        </h1>
                        <h2 style={{ ...pixelFont, fontSize: '28px', color: 'var(--accent)', lineHeight: 1.1, textShadow: 'var(--glow-accent)', marginTop: 4 }}>
                          {daysUntil} {daysUntil === 1 ? 'DAY' : 'DAYS'}
                        </h2>
                      </>
                    ) : (
                      <h1 style={{ ...pixelFont, fontSize: '32px', color: 'var(--accent)', lineHeight: 1.1, textShadow: 'var(--glow-accent)' }}>
                        DAY {dayNum}
                      </h1>
                    )}
                    <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginTop: 6 }}>{today}</p>
                  </div>
                  <StreakBadge streak={streak} />
                </div>
              );
            })()}
            {dayEntry && dayEntry.dayNumber > 0 && <DailyProgress entry={dayEntry} />}
          </div>

          <div>
            <h2 style={{ ...pixelFont, fontSize: '9px', color: 'var(--text-muted)', marginBottom: 10 }}>CORE TASKS</h2>
            {dayEntry && <ChallengeChecklist entry={dayEntry} readOnly={readOnly} onUpdate={update} weightUnit={currentUser.weightUnit ?? 'lbs'} />}
          </div>

          {dayEntry && (
            <CustomTaskList tasks={tasks} dayEntry={dayEntry} uid={activeUid} readOnly={readOnly} onDayUpdate={update} />
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// Module-level var: survives client-side navigation (same JS context).
// sessionStorage fallback: survives iOS PWA kills within the same browser session.
let _memProfile: UserProfile | null = null;
const SESSION_KEY = '75hard-profile';

function getBootProfile(): UserProfile | null {
  if (_memProfile) return _memProfile;
  return getSessionCached<UserProfile>(SESSION_KEY);
}

export default function TodayPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // Boot from whichever cache layer has data — zero loading flash on re-navigation
  const [profile, setProfile] = useState<UserProfile | null>(getBootProfile);
  const [, setProfileFetching] = useState(false);
  const [error, setError] = useState(false);

  // Show loader while auth resolves or while we have a user but no profile yet
  const showLoader = useMinDuration(
    authLoading || !profile,
    600
  );

  useEffect(() => {
    if (!user) {
      // Only clear in-memory caches here. sessionStorage is cleared by signOut()
      // so we don't wipe it during the brief auth-null phase that fires on every
      // page load while Firebase re-initialises its persistent auth state.
      _memProfile = null;
      clearAll();
      return;
    }
    const boot = getBootProfile();
    if (boot) {
      // Discard a cached profile that belongs to a different user (e.g. shared device)
      // or that still has onboardingComplete:false (stale from signup flow).
      if (boot.uid !== user.uid || boot.onboardingComplete === false) {
        _memProfile = null;
        clearAll();
        if (typeof window !== 'undefined') sessionStorage.clear();
        // Fall through to fresh Firestore fetch below
      } else {
        // Have a valid cached profile — show it immediately, refresh silently
        setProfile(boot);
        getUserProfile(user.uid)
          .then((p) => {
            if (p) {
              // Never write a stale onboarding:false into the module cache — it would
              // cause a redirect loop on the next client-side navigation.
              if (p.onboardingComplete === false) return;
              _memProfile = p; setSessionCached(SESSION_KEY, p); setProfile(p);
            }
          })
          .catch(() => {});
        getAllUsers().catch(() => {});
        getDayHistory(user.uid, 120).catch(() => {});
        return;
      }
    }
    // First load — only block on profile; everything else runs in background
    setProfileFetching(true);
    getUserProfile(user.uid)
      .then((p) => {
        if (p) {
          if (p.onboardingComplete === false) { router.replace('/onboarding'); return; }
          _memProfile = p; setSessionCached(SESSION_KEY, p); setProfile(p);
        }
        else setError(true);
        getAllUsers().catch(() => {});
        getDayHistory(user.uid, 120).catch(() => {});
      })
      .catch(() => setError(true))
      .finally(() => setProfileFetching(false));
  }, [user]);

  return (
    <>
      {/* LoadingScreen is always present in the DOM until everything is ready */}
      {showLoader && <LoadingScreen />}

      <AuthGuard>
        {error ? (
          <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
            <div style={{ fontFamily: '"VT323", monospace', fontSize: '22px', color: 'var(--red)', textAlign: 'center', lineHeight: 1.8 }}>
              Failed to load profile. Check your connection.
            </div>
          </div>
        ) : profile && !showLoader ? (
          <TodayInner
            currentUser={profile}
            onProfileUpdate={(updated) => {
              _memProfile = updated;
              setSessionCached(SESSION_KEY, updated);
              setProfile(updated);
            }}
          />
        ) : null}
      </AuthGuard>
    </>
  );
}
