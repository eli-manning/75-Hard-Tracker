import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCrewById, getCrewSummary, getUserProfile } from '../../../../lib/firestore';
import { getAvatarUrl } from '../../../../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../../../../lib/avatarMap';
import { colors, fonts, shadows } from '../../../../lib/theme';
import { Crew, CrewDaySummary, UserProfile } from '../../../../lib/types';

const GOLD = '#f0c040';

async function captureAndShare(ref: React.RefObject<View>) {
  if (Platform.OS === 'web') return;
  try {
    const rnViewShot = require('react-native-view-shot');
    const uri: string = await rnViewShot.captureRef(ref, { format: 'png', quality: 1 });
    await Share.share({
      url: uri,
      message: 'Crew day complete on CrewDay. Your crew. Your goals. Every day.',
    });
  } catch (e) {
    console.error('[CrewSummary] capture/share failed:', e);
  }
}

function MemberAvatar({ profile, size }: { profile?: UserProfile; size: number }) {
  const [imgError, setImgError] = useState(false);
  if (!profile || imgError) {
    return (
      <View style={[styles.avatarPlaceholder, { width: size, height: size }]}>
        <Ionicons name="person-outline" size={size * 0.45} color={colors.textMuted} />
      </View>
    );
  }
  const url = getAvatarUrl(profile);
  const ratio = AVATAR_PORTRAIT_RATIO[url];
  return (
    <View style={[styles.avatarFrame, { width: size, height: size }]}>
      <Image
        source={getAvatarSource(url)}
        style={{ width: size, height: ratio ? size / ratio : size }}
        resizeMode={ratio ? 'stretch' : 'cover'}
        onError={() => setImgError(true)}
      />
    </View>
  );
}

export default function CrewSummaryPage() {
  const { crewId, date } = useLocalSearchParams<{ crewId: string; date: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resultsRef = useRef<View>(null);

  const [crew, setCrew] = useState<Crew | null>(null);
  const [summary, setSummary] = useState<CrewDaySummary | null | undefined>(undefined);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!crewId || !date) return;
    Promise.all([
      getCrewById(crewId),
      getCrewSummary(crewId, date),
    ]).then(([c, s]) => {
      setCrew(c);
      setSummary(s);
    }).catch(() => {
      setSummary(null);
    }).finally(() => setLoading(false));
  }, [crewId, date]);

  // Load member profiles for avatars when summary arrives
  useEffect(() => {
    if (!summary) return;
    const uids = summary.memberResults.map((m) => m.uid);
    Promise.all(uids.map((uid) => getUserProfile(uid))).then((profiles) => {
      const map: Record<string, UserProfile> = {};
      profiles.forEach((p) => { if (p) map[p.uid] = p; });
      setMemberProfiles(map);
    }).catch(() => {});
  }, [summary]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.crewName} numberOfLines={1}>{crew?.name ?? '...'}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        {summary && Platform.OS !== 'web' && (
          <TouchableOpacity
            onPress={() => captureAndShare(resultsRef as React.RefObject<View>)}
            style={styles.shareBtn}
          >
            <Ionicons name="share-outline" size={16} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {!summary ? (
        <View style={styles.noSummary}>
          <Ionicons name="document-outline" size={40} color={colors.border} />
          <Text style={styles.noSummaryText}>NO SUMMARY FOR THIS DATE</Text>
          <Text style={styles.noSummaryBody}>
            The crew hasn't finished all tasks for this day yet, or no data was recorded.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Streak result */}
          <View style={[styles.streakResult, summary.streakSurvived ? styles.streakSurvived : styles.streakBroken]}>
            {summary.streakSurvived ? (
              <>
                <Text style={styles.streakResultTitle}>CREW COMPLETE</Text>
                <Text style={styles.streakCount}>{summary.newStreak}</Text>
                <Text style={styles.streakCountLabel}>DAY STREAK</Text>
              </>
            ) : (
              <>
                <Text style={[styles.streakResultTitle, styles.streakBrokenText]}>STREAK BROKEN</Text>
                <Text style={[styles.streakCountLabel, styles.streakBrokenText]}>Back to day 1</Text>
              </>
            )}
          </View>

          {/* Member results — captured for share */}
          <View ref={resultsRef} style={styles.section}>
            <Text style={styles.sectionTitle}>MEMBER RESULTS</Text>
            {summary.memberResults.map((m) => {
              const isMvp = summary.mvpUid === m.uid && m.completed;
              return (
                <View key={m.uid} style={[styles.memberRow, isMvp && styles.memberRowMvp]}>
                  <MemberAvatar profile={memberProfiles[m.uid]} size={32} />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>{m.displayName}</Text>
                      {isMvp && (
                        <View style={styles.mvpBadge}>
                          <Text style={styles.mvpText}>MVP</Text>
                        </View>
                      )}
                      {m.inactive && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveText}>INACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberPoints}>{m.points} PTS</Text>
                  </View>
                  <View style={[styles.completionBadge, m.completed ? styles.completedBadge : styles.missedBadge]}>
                    <Ionicons
                      name={m.completed ? 'checkmark' : 'close'}
                      size={16}
                      color={m.completed ? colors.green : colors.red}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  crewName: { fontFamily: fonts.pixel, fontSize: 9, color: colors.text },
  dateText: { fontFamily: fonts.inter, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  shareBtn: { padding: 8 },
  noSummary: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
  },
  noSummaryText: { fontFamily: fonts.pixel, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  noSummaryBody: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 24 },
  streakResult: {
    padding: 24, alignItems: 'center', gap: 8,
    borderWidth: 2,
  },
  streakSurvived: { borderColor: colors.green, backgroundColor: colors.greenLight },
  streakBroken: { borderColor: colors.red, backgroundColor: colors.redLight },
  streakResultTitle: {
    fontFamily: fonts.pixel, fontSize: 11, color: colors.green,
  },
  streakBrokenText: { color: colors.red },
  streakCount: {
    fontFamily: fonts.pixel, fontSize: 36, color: colors.accent,
    textShadowColor: colors.accentGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  streakCountLabel: { fontFamily: fonts.pixel, fontSize: 8, color: colors.green },
  section: { gap: 0 },
  sectionTitle: { fontFamily: fonts.pixel, fontSize: 9, color: colors.text, marginBottom: 12 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  memberRowMvp: {
    borderWidth: 2, borderColor: GOLD,
    paddingHorizontal: 8, marginHorizontal: -8,
    backgroundColor: `${GOLD}15`,
  },
  avatarFrame: { overflow: 'hidden', borderWidth: 2, borderColor: colors.border, flexShrink: 0 },
  avatarPlaceholder: {
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  memberInfo: { flex: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  memberName: { fontFamily: fonts.interSemiBold, fontSize: 13, color: colors.text },
  memberPoints: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  mvpBadge: {
    paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: GOLD, borderWidth: 1, borderColor: GOLD,
  },
  mvpText: { fontFamily: fonts.pixel, fontSize: 5, color: '#0a0800' },
  inactiveBadge: {
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  inactiveText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },
  completionBadge: {
    width: 28, height: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  completedBadge: { borderColor: colors.green, backgroundColor: colors.greenLight },
  missedBadge: { borderColor: colors.red, backgroundColor: colors.redLight },
});
