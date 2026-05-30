'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllUsers } from '@/hooks/useAllUsers';
import { useDayData } from '@/hooks/useDayData';
import { useCustomTasks } from '@/hooks/useCustomTasks';
import { getUserProfile } from '@/lib/firestore';
import { UserProfile, DayEntry } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';
import { UserTabBar } from '@/components/UserTabBar';
import { DailyProgress } from '@/components/DailyProgress';
import { ChallengeChecklist } from '@/components/ChallengeChecklist';
import { CustomTaskList } from '@/components/CustomTaskList';
import { StreakBadge } from '@/components/StreakBadge';
import { getDayHistory } from '@/lib/firestore';

function computeStreak(history: DayEntry[]): number {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const today = format(new Date(), 'yyyy-MM-dd');
  let streak = 0;
  let expected = today;

  for (const entry of sorted) {
    if (entry.date > today) continue;
    if (entry.date < expected) break;
    if (!entry.allCoreCompleted) {
      if (entry.date === today) continue; // today not done yet, don't break streak
      break;
    }
    streak++;
    // Move expected back one day
    const d = new Date(expected);
    d.setDate(d.getDate() - 1);
    expected = format(d, 'yyyy-MM-dd');
  }

  return streak;
}

function TodayInner({ currentUser }: { currentUser: UserProfile }) {
  const { users } = useAllUsers();
  const [activeUid, setActiveUid] = useState(currentUser.uid);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(currentUser);
  const [streak, setStreak] = useState(0);

  const readOnly = activeUid !== currentUser.uid;

  const { dayEntry, loading, update } = useDayData(
    activeUid,
    activeProfile.challengeStartDate
  );
  const { tasks } = useCustomTasks(activeUid);

  // Load profile when tab switches
  useEffect(() => {
    if (activeUid === currentUser.uid) {
      setActiveProfile(currentUser);
      return;
    }
    getUserProfile(activeUid).then((p) => {
      if (p) setActiveProfile(p);
    });
  }, [activeUid, currentUser]);

  // Compute streak for active user
  useEffect(() => {
    getDayHistory(activeUid, 90).then((history) => {
      setStreak(computeStreak(history));
    });
  }, [activeUid, dayEntry?.allCoreCompleted]);

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      {/* User tab bar */}
      {users.length > 0 && (
        <UserTabBar
          users={users}
          activeUid={activeUid}
          onSelectUser={setActiveUid}
          currentUserUid={currentUser.uid}
        />
      )}

      {/* Read-only banner */}
      {readOnly && (
        <div
          className="mx-4 mb-2 px-3 py-2 text-center"
          style={{
            ...pixelFont,
            fontSize: '7px',
            background: 'var(--yellow-light)',
            border: '2px solid var(--yellow)',
            color: 'var(--text)',
          }}
        >
          VIEWING {activeProfile.displayName.toUpperCase()}&apos;S DAY — READ ONLY
        </div>
      )}

      <div className="px-4 space-y-6">
        {/* Day header */}
        <div className="pt-2 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 style={{ ...pixelFont, fontSize: '28px', color: 'var(--accent)', lineHeight: 1.2 }}>
                DAY {dayEntry?.dayNumber ?? '—'}
              </h1>
              <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)', marginTop: 4 }}>
                {today}
              </p>
            </div>
            <StreakBadge streak={streak} />
          </div>

          {dayEntry && <DailyProgress entry={dayEntry} />}
        </div>

        {/* Core tasks */}
        <div className="space-y-2">
          <h2 style={{ ...pixelFont, fontSize: '10px', marginBottom: 8 }}>CORE TASKS</h2>
          {loading || !dayEntry ? (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
              Loading...
            </p>
          ) : (
            <ChallengeChecklist
              entry={dayEntry}
              readOnly={readOnly}
              onUpdate={update}
            />
          )}
        </div>

        {/* Custom tasks */}
        {dayEntry && (
          <div className="space-y-2">
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

      <BottomNav />
    </div>
  );
}

export default function TodayPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setProfile);
    }
  }, [user]);

  return (
    <AuthGuard>
      {profile ? (
        <TodayInner currentUser={profile} />
      ) : (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: 'var(--text-muted)' }}>
            LOADING...
          </span>
        </div>
      )}
    </AuthGuard>
  );
}
