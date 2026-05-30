'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useDayData } from '@/hooks/useDayData';
import { useCustomTasks } from '@/hooks/useCustomTasks';
import { getUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { UserTabBar } from '@/components/UserTabBar';
import { DailyProgress } from '@/components/DailyProgress';
import { ChallengeChecklist } from '@/components/ChallengeChecklist';
import { CustomTaskList } from '@/components/CustomTaskList';
import { StreakBadge } from '@/components/StreakBadge';

const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

// Animated loading screen with pixel art feel
function LoadingScreen() {
  const [frame, setFrame] = useState(0);
  const frames = ['▰▱▱▱▱▱▱▱', '▰▰▱▱▱▱▱▱', '▰▰▰▱▱▱▱▱', '▰▰▰▰▱▱▱▱', '▰▰▰▰▰▱▱▱', '▰▰▰▰▰▰▱▱', '▰▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰▰'];
  const labels = ['WAKING UP...', 'LOADING DAY...', 'FETCHING DATA...', 'ALMOST THERE...'];

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % frames.length), 180);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg)' }}>
      <div style={{ ...pixelFont, fontSize: '24px', color: 'var(--accent)', textShadow: 'var(--glow-accent)', letterSpacing: '0.1em' }}>
        75 HARD
      </div>
      <div style={{ ...pixelFont, fontSize: '14px', color: 'var(--green)', letterSpacing: '0.05em' }}>
        {frames[frame]}
      </div>
      <div style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>
        {labels[Math.floor(frame / 2) % labels.length]}
      </div>
    </div>
  );
}

// Skeleton placeholder while day data loads
function DaySkeleton({ profile }: { profile: UserProfile }) {
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  return (
    <div className="px-4 space-y-6 pt-2 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div style={{ ...pixelFont, fontSize: '32px', color: 'var(--accent)', opacity: 0.4 }}>
              DAY —
            </div>
            <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginTop: 6 }}>{today}</p>
          </div>
          {profile.currentStreak > 0 && <StreakBadge streak={profile.currentStreak} />}
        </div>
        {/* Skeleton progress bar */}
        <div className="h-5" style={{ border: '2px solid var(--border)', background: 'var(--surface)', opacity: 0.5 }} />
      </div>
      <div className="space-y-2">
        <div style={{ ...pixelFont, fontSize: '9px', color: 'var(--text-muted)', marginBottom: 10 }}>CORE TASKS</div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-3 h-14" style={{ border: '2px solid var(--border)', background: 'var(--surface)', opacity: 0.4 }} />
        ))}
      </div>
    </div>
  );
}

function TodayInner({ currentUser }: { currentUser: UserProfile }) {
  const { users, loading: usersLoading } = useAllUsers();
  const [activeUid, setActiveUid] = useState(currentUser.uid);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(currentUser);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  const readOnly = activeUid !== currentUser.uid;
  const { dayEntry, loading: dayLoading, update } = useDayData(activeUid, activeProfile.challengeStartDate);
  const { tasks } = useCustomTasks(activeUid);

  useEffect(() => {
    if (activeUid === currentUser.uid) {
      setActiveProfile(currentUser);
      setProfileError(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(false);
    getUserProfile(activeUid)
      .then((p) => { if (p) setActiveProfile(p); else setProfileError(true); })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [activeUid, currentUser]);

  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  // Use stored streak for instant display — no extra fetch needed
  const streak = activeProfile.currentStreak ?? 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      {/* User tab bar — show immediately from cache */}
      {!usersLoading && users.length > 0 && (
        <UserTabBar users={users} activeUid={activeUid} onSelectUser={setActiveUid} currentUserUid={currentUser.uid} />
      )}

      {readOnly && !profileLoading && (
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

      {/* Show skeleton with stored streak immediately, fill in real data when ready */}
      {dayLoading || profileLoading ? (
        <DaySkeleton profile={activeProfile} />
      ) : (
        <div className="px-4 space-y-6">
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
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid)
        .then(setProfile)
        .catch(() => setProfileError(true));
    }
  }, [user]);

  return (
    <AuthGuard>
      {profileError ? (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
          <div style={{ ...pixelFont, fontSize: '8px', color: 'var(--red)', textAlign: 'center', lineHeight: 2.5 }}>
            FAILED TO LOAD PROFILE.{'\n'}CHECK YOUR CONNECTION.
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
