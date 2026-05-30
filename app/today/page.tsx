'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useDayData } from '@/hooks/useDayData';
import { useCustomTasks } from '@/hooks/useCustomTasks';
import { getUserProfile, getDayHistory } from '@/lib/firestore';
import { UserProfile, DayEntry } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { UserTabBar } from '@/components/UserTabBar';
import { DailyProgress } from '@/components/DailyProgress';
import { ChallengeChecklist } from '@/components/ChallengeChecklist';
import { CustomTaskList } from '@/components/CustomTaskList';
import { StreakBadge } from '@/components/StreakBadge';

function computeStreak(history: DayEntry[]): number {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const today = format(new Date(), 'yyyy-MM-dd');
  let streak = 0;
  let expected = today;

  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (entry.date < expected) break;
    if (!entry.allCoreCompleted) {
      if (entry.date === today) continue;
      break;
    }
    streak++;
    const d = new Date(expected);
    d.setDate(d.getDate() - 1);
    expected = format(d, 'yyyy-MM-dd');
  }
  return streak;
}

const pixelFont = { fontFamily: '"Press Start 2P", monospace' };

function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
      <div
        className="w-8 h-8"
        style={{
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message && (
        <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>
          {message}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TodayInner({ currentUser }: { currentUser: UserProfile }) {
  const { users, loading: usersLoading } = useAllUsers();
  const [activeUid, setActiveUid] = useState(currentUser.uid);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(currentUser);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [streak, setStreak] = useState(0);

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
      .then((p) => {
        if (p) setActiveProfile(p);
        else setProfileError(true);
      })
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  }, [activeUid, currentUser]);

  useEffect(() => {
    getDayHistory(activeUid, 90)
      .then((history) => setStreak(computeStreak(history)))
      .catch(() => setStreak(0));
  }, [activeUid, dayEntry?.allCoreCompleted]);

  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const isLoading = profileLoading || dayLoading;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      {/* User tab bar */}
      {!usersLoading && users.length > 0 && (
        <UserTabBar
          users={users}
          activeUid={activeUid}
          onSelectUser={setActiveUid}
          currentUserUid={currentUser.uid}
        />
      )}

      {/* Read-only banner */}
      {readOnly && !profileLoading && (
        <div
          className="mx-4 mb-2 px-3 py-2 text-center"
          style={{
            ...pixelFont,
            fontSize: '6px',
            background: 'var(--surface-2)',
            border: '2px solid var(--border)',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          VIEWING {activeProfile.displayName.toUpperCase()}&apos;S DAY — READ ONLY
        </div>
      )}

      {/* Error state */}
      {profileError && (
        <div
          className="mx-4 mb-4 px-3 py-3 text-center"
          style={{
            ...pixelFont,
            fontSize: '7px',
            background: 'var(--red-light)',
            border: '2px solid var(--red)',
            color: 'var(--red)',
          }}
        >
          FAILED TO LOAD USER DATA
        </div>
      )}

      {/* Loading overlay for tab switch */}
      {isLoading ? (
        <LoadingScreen message="LOADING..." />
      ) : (
        <div className="px-4 space-y-6">
          {/* Day header */}
          <div className="pt-2 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h1
                  style={{
                    ...pixelFont,
                    fontSize: '32px',
                    color: 'var(--accent)',
                    lineHeight: 1.1,
                    textShadow: 'var(--glow-accent)',
                  }}
                >
                  DAY {dayEntry?.dayNumber ?? '—'}
                </h1>
                <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', marginTop: 6 }}>
                  {today}
                </p>
              </div>
              <StreakBadge streak={streak} />
            </div>
            {dayEntry && <DailyProgress entry={dayEntry} />}
          </div>

          {/* Core tasks */}
          <div>
            <h2 style={{ ...pixelFont, fontSize: '9px', color: 'var(--text-muted)', marginBottom: 10 }}>
              CORE TASKS
            </h2>
            {dayEntry && (
              <ChallengeChecklist entry={dayEntry} readOnly={readOnly} onUpdate={update} />
            )}
          </div>

          {/* Custom tasks */}
          {dayEntry && (
            <div>
              <CustomTaskList
                tasks={tasks}
                dayEntry={dayEntry}
                uid={activeUid}
                readOnly={readOnly}
                onDayUpdate={update}
              />
            </div>
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
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: 'var(--red)', textAlign: 'center', lineHeight: 2 }}>
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
