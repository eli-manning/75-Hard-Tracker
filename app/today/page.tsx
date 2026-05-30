'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useDayData } from '@/hooks/useDayData';
import { useCustomTasks } from '@/hooks/useCustomTasks';
import { useMinDuration } from '@/hooks/useMinDuration';
import { getUserProfile, getAllUsers } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { UserTabBar } from '@/components/UserTabBar';
import { DailyProgress } from '@/components/DailyProgress';
import { ChallengeChecklist } from '@/components/ChallengeChecklist';
import { CustomTaskList } from '@/components/CustomTaskList';
import { StreakBadge } from '@/components/StreakBadge';
import { setCached } from '@/lib/cache';

const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
const vt323 = { fontFamily: '"VT323", monospace' };

function LoadingScreen() {
  const [dots, setDots] = useState(0);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const d = setInterval(() => setDots((n) => (n + 1) % 4), 500);
    // Fill the bar over ~1.2s
    const b = setInterval(() => setFill((n) => Math.min(n + 1, 100)), 12);
    return () => { clearInterval(d); clearInterval(b); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: 'var(--bg)' }}>
      <div style={{ ...pixelFont, fontSize: '20px', color: 'var(--accent)', textShadow: 'var(--glow-accent)', lineHeight: 1.6 }}>
        75 HARD
      </div>

      <div style={{ width: 220 }}>
        <div style={{ border: '2px solid var(--border)', background: 'var(--bg)', height: 20 }}>
          <div style={{
            height: '100%',
            width: `${fill}%`,
            background: 'var(--accent)',
            boxShadow: 'var(--glow-accent)',
            transition: 'width 80ms linear',
          }} />
        </div>
        <p style={{ ...pixelFont, fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
          LOADING{'.'.repeat(dots)}
        </p>
      </div>
    </div>
  );
}

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

function TodayInner({ currentUser }: { currentUser: UserProfile }) {
  const { users } = useAllUsers();
  const [activeUid, setActiveUid] = useState(currentUser.uid);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(currentUser);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const readOnly = activeUid !== currentUser.uid;
  const { dayEntry, loading: dayLoading, update } = useDayData(activeUid, activeProfile.challengeStartDate);
  const { tasks } = useCustomTasks(activeUid);

  // Hold loading visible for at least 1.5s to avoid flash
  const showLoading = useMinDuration(dayLoading || profileLoading, 1500);

  useEffect(() => {
    if (activeUid === currentUser.uid) {
      setActiveProfile(currentUser);
      setProfileError(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(false);
    // Fetch profile and users in parallel when switching tabs
    Promise.all([
      getUserProfile(activeUid),
      getAllUsers(), // warm the users cache while we're at it
    ])
      .then(([p, allUsers]) => {
        if (p) { setActiveProfile(p); }
        else setProfileError(true);
        // Keep users cache warm
        setCached('all-users', allUsers);
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [activeUid, currentUser]);

  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const streak = activeProfile.currentStreak ?? 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      {users.length > 0 && (
        <UserTabBar users={users} activeUid={activeUid} onSelectUser={setActiveUid} currentUserUid={currentUser.uid} />
      )}

      {readOnly && !showLoading && (
        <div className="mx-4 mb-2 px-3 py-2 text-center" style={{
          ...pixelFont, fontSize: '6px',
          background: 'var(--surface-2)', border: '2px solid var(--border)', color: 'var(--text-muted)',
        }}>
          VIEWING {activeProfile.displayName.toUpperCase()}&apos;S DAY — READ ONLY
        </div>
      )}

      {profileError && (
        <div className="mx-4 mb-4 px-3 py-3 text-center" style={{
          ...pixelFont, fontSize: '7px', background: 'var(--red-light)', border: '2px solid var(--red)', color: 'var(--red)',
        }}>
          FAILED TO LOAD USER DATA
        </div>
      )}

      {showLoading ? (
        <DaySkeleton profile={activeProfile} />
      ) : (
        <div className="px-4 space-y-6 page-enter">
          <div className="pt-2 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h1 style={{ ...pixelFont, fontSize: '32px', color: 'var(--accent)', lineHeight: 1.1, textShadow: 'var(--glow-accent)' }}>
                  DAY {dayEntry?.dayNumber ?? '—'}
                </h1>
                <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginTop: 6 }}>{today}</p>
              </div>
              <StreakBadge streak={streak} />
            </div>
            {dayEntry && <DailyProgress entry={dayEntry} />}
          </div>

          <div>
            <h2 style={{ ...pixelFont, fontSize: '9px', color: 'var(--text-muted)', marginBottom: 10 }}>CORE TASKS</h2>
            {dayEntry && <ChallengeChecklist entry={dayEntry} readOnly={readOnly} onUpdate={update} />}
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

export default function TodayPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (user) {
      // Kick off profile + user list fetch in parallel on mount
      Promise.all([
        getUserProfile(user.uid),
        getAllUsers(),
      ]).then(([p, allUsers]) => {
        if (p) setProfile(p);
        else setError(true);
        setCached('all-users', allUsers);
      }).catch(() => setError(true));
    }
  }, [user]);

  return (
    <AuthGuard>
      {error ? (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
          <div style={{ ...vt323, fontSize: '22px', color: 'var(--red)', textAlign: 'center', lineHeight: 1.8 }}>
            Failed to load profile. Check your connection.
          </div>
        </div>
      ) : profile ? (
        <TodayInner currentUser={profile} />
      ) : (
        <LoadingScreen />
      )}
    </AuthGuard>
  );
}
