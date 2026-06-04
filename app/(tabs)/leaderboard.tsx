import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useAllUsers } from '../../hooks/useAllUsers';
import { getUserProfile, getGlobalLeaderboard } from '../../lib/firestore';
import { UserProfile } from '../../lib/types';
import { getAvatarUrl } from '../../lib/avatar';
import { getAvatarSource } from '../../lib/avatarMap';
import { colors, fonts, shadows } from '../../lib/theme';
import { LoadingScreen } from '../../components/LoadingScreen';
import { getSessionCached } from '../../lib/cache';

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
  const goldColor = '#f0c040';
  const isTopThree = rank <= 3;
  return (
    <View style={[rowStyles.row, isCurrentUser && rowStyles.rowSelf]}>
      <Text style={[rowStyles.rank, isTopThree && { color: goldColor }]}>#{rank}</Text>
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
      <View style={[rowStyles.pointsChip, isTopThree && { borderColor: goldColor }]}>
        <Text style={[rowStyles.pointsText, isTopThree && { color: goldColor }]}>
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
  rowSelf: { borderColor: colors.accent, backgroundColor: colors.accentLight },
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

function LeaderboardInner({ currentUser }: { currentUser: UserProfile }) {
  const [tab, setTab] = useState<'friends' | 'global'>('friends');
  const { users: allUsers } = useAllUsers();
  const [globalList, setGlobalList] = useState<UserProfile[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const insets = useSafeAreaInsets();

  const friendsList = useMemo(() => {
    const friendSet = new Set(currentUser.friends ?? []);
    const combined = allUsers.filter((u) =>
      u.uid === currentUser.uid || (friendSet.has(u.uid) && !u.leaderboardOptOut)
    );
    return [...combined].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
  }, [allUsers, currentUser.uid, currentUser.friends]);

  useEffect(() => {
    if (tab !== 'global' || globalList.length > 0) return;
    setLoadingGlobal(true);
    getGlobalLeaderboard()
      .then((list) => setGlobalList(list.slice(0, 20)))
      .catch(() => {})
      .finally(() => setLoadingGlobal(false));
  }, [tab]);

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
            {globalList.map((p, i) => (
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
                <LeaderboardRow
                  rank={
                    (currentUser.totalPoints ?? 0) > 0
                      ? globalList.filter((u) => (u.totalPoints ?? 0) > (currentUser.totalPoints ?? 0)).length + 1
                      : globalList.length + 1
                  }
                  profile={currentUser}
                  isCurrentUser={true}
                />
              </>
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
    () => getSessionCached<UserProfile>('75hard-profile')
  );
  useEffect(() => {
    if (user && !profile) {
      getUserProfile(user.uid)
        .then((p) => { if (p) setProfile(p); })
        .catch(() => {});
    }
  }, [user]);
  if (!profile) return <LoadingScreen />;
  return <LeaderboardInner currentUser={profile} />;
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
  tabBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  tabBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  tabBtnTextActive: { color: colors.accent },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  divider: { alignItems: 'center', paddingVertical: 8 },
  dividerText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  loading: { alignItems: 'center', paddingVertical: 32 },
});
