import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { format, differenceInDays, parseISO, subDays } from 'date-fns';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useAllUsers } from '../../hooks/useAllUsers';
import { useDayData } from '../../hooks/useDayData';
import { useCustomTasks } from '../../hooks/useCustomTasks';
import { useMinDuration } from '../../hooks/useMinDuration';
import { getUserProfile, getAllUsers, getPendingRequests, getOrCreateDayEntry, getDayHistory, updateUserProfile, updateDayEntry, incrementUserPoints } from '../../lib/firestore';
import { getCached, getSessionCached, setSessionCached, clearAll } from '../../lib/cache';
import { UserProfile, DayEntry } from '../../lib/types';
import { LoadingScreen } from '../../components/LoadingScreen';
import { UserTabBar } from '../../components/UserTabBar';
import { DailyProgress } from '../../components/DailyProgress';
import { ChallengeChecklist } from '../../components/ChallengeChecklist';
import { CustomTaskList } from '../../components/CustomTaskList';
import { StreakBadge } from '../../components/StreakBadge';
import { SideMenu } from '../../components/SideMenu';
import { MilestoneBanner } from '../../components/MilestoneBanner';
import { RestartModal } from '../../components/RestartModal';
import { MissedDayModal } from '../../components/MissedDayModal';
import { computeDayPoints } from '../../lib/points';
import { colors, fonts } from '../../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function DaySkeleton({ profile }: { profile: UserProfile }) {
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <View>
          <Text style={styles.skeletonDayNum}>DAY —</Text>
          <Text style={styles.skeletonDate}>{today}</Text>
        </View>
        {profile.currentStreak > 0 && <StreakBadge streak={profile.currentStreak} />}
      </View>
      <View style={styles.skeletonBar} />
      <Text style={styles.skeletonLabel}>CORE TASKS</Text>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={[styles.skeletonTask, { opacity: 1 - i * 0.1 }]} />
      ))}
    </View>
  );
}

function TodayInner({ currentUser, onProfileUpdate }: { currentUser: UserProfile; onProfileUpdate: (p: UserProfile) => void }) {
  const { users: allUsers } = useAllUsers();
  const users = useMemo(() => {
    const friendSet = new Set(currentUser.friends ?? []);
    return [
      ...allUsers.filter((u) => u.uid === currentUser.uid),
      ...allUsers.filter((u) => u.uid !== currentUser.uid && friendSet.has(u.uid)),
    ];
  }, [allUsers, currentUser.uid, currentUser.friends]);

  const [activeUid, setActiveUid] = useState(currentUser.uid);
  const [activeProfile, setActiveProfile] = useState<UserProfile>(currentUser);

  // Reset to own day whenever the signed-in user changes (e.g. after sign-out + sign-in)
  useEffect(() => {
    setActiveUid(currentUser.uid);
    setActiveProfile(currentUser);
  }, [currentUser.uid]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [nudgedTasks, setNudgedTasks] = useState<Set<string>>(new Set());
  const [pendingNudge, setPendingNudge] = useState<{ taskKey: string; message: string } | null>(null);
  const [dismissedMilestone, setDismissedMilestone] = useState<number | null>(null);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showMissedDay, setShowMissedDay] = useState(false);
  const [yesterdayEntry, setYesterdayEntry] = useState<DayEntry | null>(null);
  const missedDayChecked = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getPendingRequests(currentUser.uid)
      .then((reqs) => setPendingRequestCount(reqs.length))
      .catch(() => {});
  }, [currentUser.uid]);

  const readOnly = activeUid !== currentUser.uid;
  const { dayEntry, loading: dayLoading, update } = useDayData(activeUid, activeProfile.challengeStartDate);
  const { tasks } = useCustomTasks(activeUid);

  const isTabSwitch = activeUid !== currentUser.uid && profileLoading;
  const showSkeleton = useMinDuration(isTabSwitch || (dayLoading && !dayEntry), 600);

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

  useEffect(() => {
    if (readOnly || missedDayChecked.current) return;
    if (!dayEntry || !activeProfile.challengeMode || activeProfile.challengeMode !== '75hard') return;
    missedDayChecked.current = true;
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (!activeProfile.challengeStartDate || yesterday < activeProfile.challengeStartDate) return;
    getOrCreateDayEntry(activeUid, yesterday, activeProfile.challengeStartDate)
      .then((entry) => {
        if (!entry.allCoreCompleted) {
          setYesterdayEntry(entry);
          setShowMissedDay(true);
        }
      })
      .catch(() => {});
  }, [dayEntry, readOnly, activeProfile.challengeMode, activeProfile.challengeStartDate]);

  const wrappedUpdate = useCallback(async (patch: Partial<DayEntry>) => {
    if (!dayEntry) return;
    const merged = { ...dayEntry, ...patch };
    const newPts = computeDayPoints(merged, tasks);
    const oldPts = dayEntry.dailyPoints ?? 0;
    const delta = newPts - oldPts;
    await update({ ...patch, dailyPoints: newPts });
    if (delta !== 0) {
      incrementUserPoints(activeUid, delta).catch(() => {});
    }
  }, [dayEntry, tasks, update, activeUid]);

  async function handleRestartConfirm({ keepPoints, keepLongestStreak }: { keepPoints: boolean; keepLongestStreak: boolean }) {
    const { format: fmt } = await import('date-fns');
    await updateUserProfile(activeUid, {
      challengeStartDate: fmt(new Date(), 'yyyy-MM-dd'),
      currentStreak: 0,
      ...(keepLongestStreak ? {} : { longestStreak: 0 }),
      ...(keepPoints ? {} : { totalPoints: 0 }),
    });
    clearAll();
    setShowRestartModal(false);
    setShowMissedDay(false);
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const nudgeQuota = useMemo(() => {
    if (!currentUser.nudgeResetDate || currentUser.nudgeResetDate !== todayStr) {
      return { remaining: 5, purchased: 0 };
    }
    return {
      remaining: currentUser.nudgesRemaining ?? 5,
      purchased: currentUser.purchasedNudgesToday ?? 0,
    };
  }, [currentUser, todayStr]);

  async function doSendNudge(taskKey: string, message: string) {
    setNudgedTasks((prev) => new Set([...prev, taskKey]));
    try {
      await addDoc(collection(getFirebaseDb(), 'nudges'), {
        fromUid: currentUser.uid,
        toUid: activeProfile.uid,
        fromName: currentUser.displayName,
        message,
        taskKey,
        sentAt: serverTimestamp(),
      });
      onProfileUpdate({
        ...currentUser,
        nudgeResetDate: todayStr,
        nudgesRemaining: Math.max(0, nudgeQuota.remaining - 1),
        purchasedNudgesToday: nudgeQuota.purchased,
      });
    } catch {}
    setTimeout(() => setNudgedTasks((prev) => {
      const next = new Set(prev);
      next.delete(taskKey);
      return next;
    }), 60_000);
  }

  async function handleSpendPoints() {
    if (!pendingNudge) return;
    const { taskKey, message } = pendingNudge;
    setPendingNudge(null);
    setNudgedTasks((prev) => new Set([...prev, taskKey]));
    try {
      await addDoc(collection(getFirebaseDb(), 'nudges'), {
        fromUid: currentUser.uid,
        toUid: activeProfile.uid,
        fromName: currentUser.displayName,
        message,
        taskKey,
        sentAt: serverTimestamp(),
      });
      onProfileUpdate({
        ...currentUser,
        nudgeResetDate: todayStr,
        nudgesRemaining: 0,
        purchasedNudgesToday: nudgeQuota.purchased + 1,
        totalPoints: Math.max(0, (currentUser.totalPoints ?? 0) - 10),
      });
    } catch {}
    setTimeout(() => setNudgedTasks((prev) => {
      const next = new Set(prev);
      next.delete(taskKey);
      return next;
    }), 60_000);
  }

  async function sendNudge(taskKey: string, message: string) {
    if (nudgedTasks.has(taskKey)) return;
    if (nudgeQuota.remaining <= 0) {
      setPendingNudge({ taskKey, message });
      return;
    }
    await doSendNudge(taskKey, message);
  }
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const streak = activeProfile.currentStreak ?? 0;
  const dayNum = activeProfile.challengeStartDate
    ? differenceInDays(parseISO(todayStr), parseISO(activeProfile.challengeStartDate)) + 1
    : 0;

  return (
    <View style={styles.container}>
      <RestartModal
        visible={showRestartModal}
        onConfirm={handleRestartConfirm}
        onCancel={() => setShowRestartModal(false)}
      />
      {yesterdayEntry && (
        <MissedDayModal
          visible={showMissedDay}
          yesterdayEntry={yesterdayEntry}
          onMissed={() => { setShowMissedDay(false); setShowRestartModal(true); }}
          onSaved={async (patch) => {
            if (!yesterdayEntry) return;
            await updateDayEntry(activeUid, format(subDays(new Date(), 1), 'yyyy-MM-dd'), patch);
            setShowMissedDay(false);
          }}
          onDismiss={() => setShowMissedDay(false)}
        />
      )}
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {users.length > 0 ? (
          <UserTabBar users={users} activeUid={activeUid} onSelectUser={setActiveUid} currentUserUid={currentUser.uid} />
        ) : <View />}
        <View style={styles.hamburgerWrapper}>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            style={styles.hamburger}
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
          {pendingRequestCount > 0 && <View style={styles.notifDot} />}
        </View>
      </View>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        profile={currentUser}
        onProfileUpdate={onProfileUpdate}
        onRequestsSeen={() => setPendingRequestCount(0)}
      />

      {pendingNudge && (
        <Modal transparent animationType="fade">
          <View style={styles.spendBackdrop}>
            <View style={styles.spendCard}>
              {nudgeQuota.purchased >= 5 || (currentUser.totalPoints ?? 0) < 10 ? (
                <>
                  <Text style={styles.spendTitle}>NOT ENOUGH POINTS</Text>
                  <Text style={styles.spendBody}>
                    {nudgeQuota.purchased >= 5
                      ? "You've sent 5 paid nudges today. Try again tomorrow."
                      : `You need 10 points to send a nudge. You have ${currentUser.totalPoints ?? 0}.`}
                  </Text>
                  <TouchableOpacity onPress={() => setPendingNudge(null)} style={styles.spendCancelBtn}>
                    <Text style={styles.spendCancelText}>OK</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.spendTitle}>SPEND 10 POINTS?</Text>
                  <Text style={styles.spendBody}>
                    {"You've used all 5 free nudges today.\n"}
                    {`You have ${currentUser.totalPoints ?? 0} points.\n`}
                    {`Paid nudges today: ${nudgeQuota.purchased}/5`}
                  </Text>
                  <View style={styles.spendBtns}>
                    <TouchableOpacity onPress={() => setPendingNudge(null)} style={styles.spendCancelBtn}>
                      <Text style={styles.spendCancelText}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSpendPoints} style={styles.spendConfirmBtn}>
                      <Text style={styles.spendConfirmText}>SPEND 10 PTS</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {readOnly && !showSkeleton && (
          <View style={styles.viewingBanner}>
            <Text style={styles.viewingBannerText}>
              VIEWING {activeProfile.displayName.toUpperCase()}'S DAY
            </Text>
            <Text style={styles.nudgeQuotaText}>
              {nudgeQuota.remaining > 0
                ? `${nudgeQuota.remaining} NUDGE${nudgeQuota.remaining !== 1 ? 'S' : ''} LEFT TODAY`
                : '0 FREE — 10 PTS EACH'}
            </Text>
          </View>
        )}

        {profileError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>FAILED TO LOAD USER DATA</Text>
          </View>
        )}

        {showSkeleton ? (
          <DaySkeleton profile={activeProfile} />
        ) : (
          <View style={styles.content}>
            <View style={styles.dayHeader}>
              {(() => {
                const notStarted = dayNum <= 0;
                const daysUntil = notStarted ? Math.abs(dayNum) + 1 : 0;
                return (
                  <View style={styles.dayHeaderRow}>
                    <View>
                      {notStarted ? (
                        <>
                          <Text style={styles.startsInLabel}>STARTS IN</Text>
                          <Text style={styles.daysUntil}>{daysUntil} {daysUntil === 1 ? 'DAY' : 'DAYS'}</Text>
                        </>
                      ) : (
                        <Text style={styles.dayNum}>DAY {dayNum}</Text>
                      )}
                      <Text style={styles.dateText}>{today}</Text>
                    </View>
                    <StreakBadge streak={streak} />
                  </View>
                );
              })()}
              {dayEntry && dayEntry.dayNumber > 0 && <DailyProgress entry={dayEntry} />}
            </View>

            {!readOnly && dayNum > 0 && [25, 50, 75].includes(dayNum) && dismissedMilestone !== dayNum && (
              <MilestoneBanner dayNum={dayNum} onDismiss={() => setDismissedMilestone(dayNum)} />
            )}

            <View>
              <Text style={styles.sectionLabel}>CORE TASKS</Text>
              {dayEntry && (
                <ChallengeChecklist
                  entry={dayEntry}
                  readOnly={readOnly}
                  onUpdate={wrappedUpdate}
                  weightUnit={currentUser.weightUnit ?? 'lbs'}
                  onNudge={readOnly ? sendNudge : undefined}
                  nudgedTasks={readOnly ? nudgedTasks : undefined}
                />
              )}
            </View>

            {dayEntry && (
              <CustomTaskList
                tasks={tasks}
                dayEntry={dayEntry}
                uid={activeUid}
                readOnly={readOnly}
                onDayUpdate={wrappedUpdate}
                onNudge={readOnly ? sendNudge : undefined}
                nudgedTasks={readOnly ? nudgedTasks : undefined}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

let _memProfile: UserProfile | null = null;
const SESSION_KEY = '75hard-profile';

function getBootProfile(): UserProfile | null {
  if (_memProfile) return _memProfile;
  return getSessionCached<UserProfile>(SESSION_KEY);
}

export default function TodayPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(getBootProfile);
  const [error, setError] = useState(false);

  const showLoader = useMinDuration(authLoading || !profile, 600);

  useEffect(() => {
    if (!user) {
      _memProfile = null;
      clearAll();
      setProfile(null);
      return;
    }
    const boot = getBootProfile();
    if (boot) {
      if (boot.uid !== user.uid || boot.onboardingComplete === false) {
        _memProfile = null;
        clearAll();
      } else {
        setProfile(boot);
        getUserProfile(user.uid)
          .then((p) => {
            if (p) {
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
    getUserProfile(user.uid)
      .then((p) => {
        if (p) {
          if (p.onboardingComplete === false) { router.replace('/onboarding' as any); return; }
          _memProfile = p; setSessionCached(SESSION_KEY, p); setProfile(p);
        }
        else setError(true);
        getAllUsers().catch(() => {});
        getDayHistory(user.uid, 120).catch(() => {});
      })
      .catch(() => setError(true));
  }, [user]);

  return (
    <>
      {showLoader && <LoadingScreen />}
      {error ? (
        <View style={styles.errorScreen}>
          <Text style={styles.errorScreenText}>Failed to load profile. Check your connection.</Text>
        </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  hamburgerWrapper: { position: 'relative', marginLeft: 8, flexShrink: 0 },
  hamburger: { flexDirection: 'column', gap: 6, padding: 4, opacity: 0.6 },
  hamburgerLine: { width: 20, height: 2, backgroundColor: colors.text },
  notifDot: {
    position: 'absolute', top: 0, right: 0,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.bg,
  },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16 },
  viewingBanner: {
    marginBottom: 8, padding: 8,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  viewingBannerText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  nudgeQuotaText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, marginTop: 2, opacity: 0.7 },
  spendBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  spendCard: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent, padding: 24, gap: 16, width: '100%' },
  spendTitle: { fontFamily: fonts.pixel, fontSize: 9, color: colors.accent },
  spendBody: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, lineHeight: 12 },
  spendBtns: { flexDirection: 'row', gap: 8 },
  spendCancelBtn: { flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  spendCancelText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  spendConfirmBtn: { flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentLight, alignItems: 'center' },
  spendConfirmText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.accent },
  errorBanner: {
    marginBottom: 16, padding: 12,
    borderWidth: 2, borderColor: colors.red,
    backgroundColor: colors.redLight,
    alignItems: 'center',
  },
  errorBannerText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.red },
  content: { gap: 24 },
  dayHeader: { gap: 12 },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  dayNum: {
    fontFamily: fonts.pixel, fontSize: 32, color: colors.accent, lineHeight: 44,
    textShadowColor: 'rgba(232, 100, 58, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  startsInLabel: { fontFamily: fonts.pixel, fontSize: 16, color: colors.textMuted, lineHeight: 24 },
  daysUntil: {
    fontFamily: fonts.pixel, fontSize: 28, color: colors.accent, lineHeight: 36, marginTop: 4,
    textShadowColor: 'rgba(232, 100, 58, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  dateText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, marginTop: 6 },
  sectionLabel: { fontFamily: fonts.pixel, fontSize: 9, color: colors.textMuted, marginBottom: 10 },
  skeletonContainer: { gap: 12, padding: 4 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  skeletonDayNum: { fontFamily: fonts.pixel, fontSize: 32, color: colors.accent, opacity: 0.3, lineHeight: 44 },
  skeletonDate: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, marginTop: 6 },
  skeletonLabel: { fontFamily: fonts.pixel, fontSize: 9, color: colors.textMuted, opacity: 0.5 },
  skeletonBar: { height: 20, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  skeletonTask: { height: 52, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  errorScreenText: { fontFamily: fonts.vt323, fontSize: 22, color: colors.red, textAlign: 'center', lineHeight: 32 },
});
