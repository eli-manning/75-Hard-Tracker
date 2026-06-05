import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAllUsers } from '../../hooks/useAllUsers';
import { getUserProfile, getGlobalLeaderboard, updateUserProfile } from '../../lib/firestore';
import { UserProfile } from '../../lib/types';
import { getAvatarUrl } from '../../lib/avatar';
import { getAvatarSource } from '../../lib/avatarMap';
import { colors, fonts, shadows } from '../../lib/theme';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useHideNavWhileLoading } from '../../context/NavVisibilityContext';
import { getSessionCached, invalidate } from '../../lib/cache';

function LeaderboardRow({
  rank,
  profile,
  isCurrentUser,
}: {
  rank: number;
  profile: UserProfile;
  isCurrentUser: boolean;
}) {
  const avatarUrl = getAvatarUrl(profile);
  const isTopThree = rank <= 3;
  return (
    <View style={[rowStyles.row, isCurrentUser && rowStyles.rowSelf]}>
      <Text style={[rowStyles.rank, isTopThree && { color: colors.yellow }]}>#{rank}</Text>
      <Image
        source={getAvatarSource(avatarUrl)}
        style={rowStyles.avatar}
        resizeMode="cover"
      />
      <View style={rowStyles.info}>
        <Text style={rowStyles.name} numberOfLines={1}>{profile.displayName}</Text>
        {(profile.currentStreak ?? 0) > 0 && (
          <Text style={rowStyles.streak}>{profile.currentStreak} DAY STREAK</Text>
        )}
      </View>
      <View style={[rowStyles.pointsChip, isTopThree && { borderColor: colors.yellow, backgroundColor: colors.yellowLight }]}>
        <Text style={[rowStyles.pointsText, isTopThree && { color: colors.yellow }]}>
          {profile.totalPoints ?? 0} PTS
        </Text>
      </View>
      {isCurrentUser && (
        <View style={rowStyles.youChip}>
          <Text style={rowStyles.youText}>YOU</Text>
        </View>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  rowSelf: { borderColor: colors.accent, borderWidth: 3, backgroundColor: colors.surface2 },
  rank: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted, minWidth: 28, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderWidth: 2, borderColor: colors.border },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.vt323, fontSize: 20, color: colors.text },
  streak: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },
  pointsChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.accent,
    flexShrink: 0,
  },
  pointsText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.accent },
  youChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.green,
    flexShrink: 0,
  },
  youText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.green },
});

function LeaderboardInner({ currentUser, onOptIn }: { currentUser: UserProfile; onOptIn: () => void }) {
  const [tab, setTab] = useState<'friends' | 'global'>('friends');
  const { users: allUsers } = useAllUsers();
  const [globalList, setGlobalList] = useState<UserProfile[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [optingIn, setOptingIn] = useState(false);
  const insets = useSafeAreaInsets();

  const isOptedOut = currentUser.leaderboardOptOut !== false;

  const friendsList = useMemo(() => {
    const friendSet = new Set(currentUser.friends ?? []);
    const combined = allUsers.filter((u) =>
      u.uid === currentUser.uid || friendSet.has(u.uid)
    );
    return [...combined].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
  }, [allUsers, currentUser.uid, currentUser.friends]);

  function fetchGlobal() {
    invalidate('all-users');
    setLoadingGlobal(true);
    getGlobalLeaderboard()
      .then((list) => setGlobalList(list))
      .catch(() => {})
      .finally(() => setLoadingGlobal(false));
  }

  async function handleOptIn() {
    setOptingIn(true);
    try {
      await updateUserProfile(currentUser.uid, { leaderboardOptOut: false });
      const updatedUser = { ...currentUser, leaderboardOptOut: false };
      onOptIn();
      setLoadingGlobal(true);
      getGlobalLeaderboard()
        .then((list) => {
          const alreadyIn = list.some((u) => u.uid === updatedUser.uid);
          setGlobalList(alreadyIn ? list : [...list, updatedUser].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)));
        })
        .catch(() => {})
        .finally(() => setLoadingGlobal(false));
    } catch {}
    setOptingIn(false);
  }

  useFocusEffect(
    useCallback(() => {
      setGlobalList([]);
    }, [])
  );

  useEffect(() => {
    if (tab !== 'global' || globalList.length > 0) return;
    fetchGlobal();
  }, [tab, globalList.length]);

  const inTopGlobal = tab === 'global' && globalList.some((u) => u.uid === currentUser.uid);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>LEADERBOARD</Text>
        <View style={styles.tabRow}>
          {(['friends', 'global'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'friends' ? (
          friendsList.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>ADD FRIENDS TO SEE RANKINGS</Text>
            </View>
          ) : (
            friendsList.map((p, i) => (
              <LeaderboardRow
                key={p.uid}
                rank={i + 1}
                profile={p}
                isCurrentUser={p.uid === currentUser.uid}
              />
            ))
          )
        ) : loadingGlobal ? (
          <View style={styles.loading}>
            <Text style={styles.emptyText}>LOADING...</Text>
          </View>
        ) : (
          <>
            {globalList
              .filter((p) => !(p.uid === currentUser.uid && isOptedOut))
              .map((p, i) => (
                <LeaderboardRow
                  key={p.uid}
                  rank={i + 1}
                  profile={p}
                  isCurrentUser={p.uid === currentUser.uid}
                />
              ))}
            {!inTopGlobal && globalList.length > 0 && (
              <>
                <View style={styles.divider}>
                  <Text style={styles.dividerText}>- - - - -</Text>
                </View>
                {isOptedOut ? (
                  <View style={styles.optInCard}>
                    <Text style={styles.optInLabel}>YOU ARE NOT ON THE GLOBAL BOARD</Text>
                    <TouchableOpacity
                      onPress={handleOptIn}
                      disabled={optingIn}
                      style={[styles.optInBtn, optingIn && { opacity: 0.5 }]}
                    >
                      <Text style={styles.optInBtnText}>{optingIn ? 'JOINING...' : 'JOIN GLOBAL LEADERBOARD'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <LeaderboardRow
                    rank={
                      (currentUser.totalPoints ?? 0) > 0
                        ? globalList.filter((u) => (u.totalPoints ?? 0) > (currentUser.totalPoints ?? 0)).length + 1
                        : globalList.length + 1
                    }
                    profile={currentUser}
                    isCurrentUser={true}
                  />
                )}
              </>
            )}
            {isOptedOut && globalList.length === 0 && (
              <View style={styles.optInCard}>
                <Text style={styles.optInLabel}>YOU ARE NOT ON THE GLOBAL BOARD</Text>
                <TouchableOpacity
                  onPress={handleOptIn}
                  disabled={optingIn}
                  style={[styles.optInBtn, optingIn && { opacity: 0.5 }]}
                >
                  <Text style={styles.optInBtnText}>{optingIn ? 'JOINING...' : 'JOIN GLOBAL LEADERBOARD'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(
    () => getSessionCached<UserProfile>('crewday-profile')
  );
  useHideNavWhileLoading(!profile);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getUserProfile(user.uid)
        .then((p) => { if (p) setProfile(p); })
        .catch(() => {});
    }, [user?.uid])
  );

  if (!profile) return <LoadingScreen />;
  return (
    <LeaderboardInner
      currentUser={profile}
      onOptIn={() => setProfile((p) => p ? { ...p, leaderboardOptOut: false } : p)}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  title: { fontFamily: fonts.pixel, fontSize: 14, color: colors.accent },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    ...shadows.pixel,
  },
  tabBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  tabBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  tabBtnTextActive: { color: colors.white },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  divider: { alignItems: 'center', paddingVertical: 8 },
  dividerText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  loading: { alignItems: 'center', paddingVertical: 32 },
  optInCard: {
    padding: 16, gap: 12, alignItems: 'center',
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optInLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  optInBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
    borderWidth: 2, borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  optInBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.white },
});
