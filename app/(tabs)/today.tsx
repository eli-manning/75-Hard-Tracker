import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { format, differenceInDays, parseISO } from 'date-fns';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useAllUsers } from '../../hooks/useAllUsers';
import { useDayData } from '../../hooks/useDayData';
import { useCustomTasks } from '../../hooks/useCustomTasks';
import { useMinDuration } from '../../hooks/useMinDuration';
import { getUserProfile, getAllUsers, getPendingRequests, getOrCreateDayEntry, getDayHistory } from '../../lib/firestore';
import { getCached, getSessionCached, setSessionCached, clearAll } from '../../lib/cache';
import { UserProfile, DayEntry } from '../../lib/types';
import { LoadingScreen } from '../../components/LoadingScreen';
import { UserTabBar } from '../../components/UserTabBar';
import { DailyProgress } from '../../components/DailyProgress';
import { ChallengeChecklist } from '../../components/ChallengeChecklist';
import { CustomTaskList } from '../../components/CustomTaskList';
import { StreakBadge } from '../../components/StreakBadge';
import { SideMenu } from '../../components/SideMenu';
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
  const [nudgeCooldown, setNudgeCooldown] = useState(false);
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

  async function sendNudge() {
    if (nudgeCooldown) return;
    setNudgeCooldown(true);
    try {
      await addDoc(collection(getFirebaseDb(), 'nudges'), {
        fromUid: currentUser.uid,
        toUid: activeProfile.uid,
        fromName: currentUser.displayName,
        sentAt: serverTimestamp(),
      });
    } catch {}
    setTimeout(() => setNudgeCooldown(false), 60_000);
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const streak = activeProfile.currentStreak ?? 0;
  const dayNum = activeProfile.challengeStartDate
    ? differenceInDays(parseISO(todayStr), parseISO(activeProfile.challengeStartDate)) + 1
    : 0;

  return (
    <View style={styles.container}>
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
            <TouchableOpacity
              onPress={sendNudge}
              disabled={nudgeCooldown}
              style={[styles.nudgeBtn, nudgeCooldown && styles.nudgeBtnDisabled]}
            >
              <Text style={styles.nudgeBtnText}>{nudgeCooldown ? 'NUDGED!' : '👊 NUDGE'}</Text>
            </TouchableOpacity>
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

            <View>
              <Text style={styles.sectionLabel}>CORE TASKS</Text>
              {dayEntry && (
                <ChallengeChecklist
                  entry={dayEntry}
                  readOnly={readOnly}
                  onUpdate={update}
                  weightUnit={currentUser.weightUnit ?? 'lbs'}
                />
              )}
            </View>

            {dayEntry && (
              <CustomTaskList
                tasks={tasks}
                dayEntry={dayEntry}
                uid={activeUid}
                readOnly={readOnly}
                onDayUpdate={update}
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
  nudgeBtn: {
    marginTop: 8, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentLight,
  },
  nudgeBtnDisabled: { borderColor: colors.border, backgroundColor: colors.surface },
  nudgeBtnText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.accent },
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
