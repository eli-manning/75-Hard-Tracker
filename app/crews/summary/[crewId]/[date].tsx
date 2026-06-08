import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Share,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCrewById, getCrewSummary, getUserProfile } from '../../../../lib/firestore';
import { getCrewIconIon } from '../../../../lib/crews';
import { getAvatarUrl } from '../../../../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../../../../lib/avatarMap';
import { colors, fonts, shadows } from '../../../../lib/theme';
import { Crew, CrewDaySummary, UserProfile } from '../../../../lib/types';
import { format, parseISO } from 'date-fns';

const GOLD = '#f0c040';

const CORE_TASK_LABELS: Record<string, string> = {
  workout1: 'Workout #1 — 45 min',
  workout2: 'Workout #2 — Outdoor',
  diet: 'No cheat meals today',
  water: 'Drink 1 gallon of water',
  reading: 'Read 10 pages',
  photo: 'Progress photo',
};

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
  const cardRef = useRef<View>(null);

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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const dateFormatted = date ? format(parseISO(date), 'MMMM d, yyyy').toUpperCase() : '';
  const activeCoreKeys = crew
    ? Object.entries(crew.activeTasks ?? {}).filter(([, v]) => v).map(([k]) => k)
    : [];
  const customTasks = crew?.customCrewTasks ?? [];
  const totalTasks = activeCoreKeys.length + customTasks.length;
  const mvpProfile = summary?.mvpUid ? memberProfiles[summary.mvpUid] : undefined;

  return (
    <View style={styles.container}>
      {/* Top accent section */}
      <View style={[styles.section1, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.white} />
        </TouchableOpacity>

        {!summary ? (
          <View style={styles.section1Content}>
            <Text style={styles.crewCompleteText}>NO SUMMARY</Text>
            <Text style={styles.crewNameText}>{crew?.name ?? '...'}</Text>
            <Text style={styles.section1Date}>{dateFormatted}</Text>
          </View>
        ) : (
          <View style={styles.section1Content}>
            <Text style={styles.crewCompleteText}>CREW COMPLETE</Text>
            <Text style={styles.crewNameText}>{crew?.name ?? '...'}</Text>
            <Text style={styles.section1Date}>{dateFormatted}</Text>
            <View style={styles.section1Streak}>
              <Text style={styles.section1StreakNum}>{summary.newStreak}</Text>
              <Text style={styles.section1StreakLabel}>DAY STREAK</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom cream section */}
      <View style={styles.section2}>
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
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <View ref={cardRef} style={styles.shareCard}>
              {/* Logo row */}
              <View style={styles.logoRow}>
                <Image source={require('../../../../assets/icon.png')} style={styles.logoImg} resizeMode="contain" />
                <Text style={styles.logoText}>CREWDAY</Text>
                <View style={{ flex: 1 }} />
                {crew && (
                  <Ionicons name={getCrewIconIon(crew.icon) as any} size={16} color={colors.textMuted} />
                )}
              </View>

              {/* MVP spotlight */}
              {mvpProfile && (
                <View style={styles.mvpSection}>
                  <MemberAvatar profile={mvpProfile} size={56} />
                  <View style={styles.mvpInfo}>
                    <View style={styles.mvpBadgeRow}>
                      <View style={styles.mvpBadge}>
                        <Text style={styles.mvpBadgeText}>MVP</Text>
                      </View>
                    </View>
                    <Text style={styles.mvpName} numberOfLines={1}>{mvpProfile.displayName}</Text>
                    <Text style={styles.mvpPts}>
                      {summary.memberResults.find((m) => m.uid === summary.mvpUid)?.points ?? 0} PTS
                    </Text>
                  </View>
                </View>
              )}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNum}>{summary.newStreak}</Text>
                  <Text style={styles.statLabel}>DAY STREAK</Text>
                </View>
                <View style={[styles.statBlock, styles.statBlockBorder]}>
                  <Text style={styles.statNum}>{summary.memberResults.filter((m) => !m.inactive).length}</Text>
                  <Text style={styles.statLabel}>MEMBERS</Text>
                </View>
                <View style={[styles.statBlock, styles.statBlockBorder]}>
                  <Text style={styles.statNum}>{totalTasks}</Text>
                  <Text style={styles.statLabel}>TASKS DONE</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Completed task list */}
              {totalTasks > 0 && (
                <View style={styles.taskList}>
                  {activeCoreKeys.map((key) => (
                    <View key={key} style={styles.taskRow}>
                      <View style={styles.taskCheck}>
                        <Svg width={10} height={8} viewBox="0 0 12 10" fill="none">
                          <Path d="M1 5l3 3 7-7" stroke={colors.bg} strokeWidth={2.5} strokeLinecap="square" />
                        </Svg>
                      </View>
                      <Text style={styles.taskLabel}>{CORE_TASK_LABELS[key] ?? key}</Text>
                    </View>
                  ))}
                  {customTasks.map((t) => (
                    <View key={t.id} style={styles.taskRow}>
                      <View style={styles.taskCheck}>
                        <Svg width={10} height={8} viewBox="0 0 12 10" fill="none">
                          <Path d="M1 5l3 3 7-7" stroke={colors.bg} strokeWidth={2.5} strokeLinecap="square" />
                        </Svg>
                      </View>
                      <Text style={styles.taskLabel}>{t.label}</Text>
                      {t.amount != null && (
                        <View style={styles.taskBadge}>
                          <Text style={styles.taskBadgeText}>{t.amount}{t.unit ? ` ${t.unit.toUpperCase()}` : ''}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.divider} />

              {/* Member results */}
              <View style={styles.memberList}>
                {summary.memberResults.map((m) => {
                  const isMvp = summary.mvpUid === m.uid && m.completed;
                  const profile = memberProfiles[m.uid];
                  return (
                    <View key={m.uid} style={[styles.memberRow, isMvp && styles.memberRowMvp]}>
                      <MemberAvatar profile={profile} size={32} />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {profile?.displayName ?? m.displayName}
                        </Text>
                        <Text style={styles.memberPts}>{m.points} PTS</Text>
                      </View>
                      {isMvp && (
                        <View style={styles.mvpBadge}>
                          <Text style={styles.mvpBadgeText}>MVP</Text>
                        </View>
                      )}
                      {m.inactive && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveText}>INACTIVE</Text>
                        </View>
                      )}
                      <View style={[styles.completionBox, m.completed ? styles.completionDone : styles.completionMiss]}>
                        <Ionicons
                          name={m.completed ? 'checkmark' : 'close'}
                          size={14}
                          color={m.completed ? colors.green : colors.red}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Buttons */}
        <View style={[styles.btnRow, { paddingBottom: insets.bottom + 8 }]}>
          {summary && Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => captureAndShare(cardRef as React.RefObject<View>)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={13} color={colors.white} />
              <Text style={styles.shareBtnText}>SHARE</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.closeBtn, (!summary || Platform.OS === 'web') && { flex: 1 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.accent },

  section1: {
    flex: 38,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backBtn: { padding: 4, alignSelf: 'flex-start', marginBottom: 8 },
  section1Content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  crewCompleteText: {
    fontFamily: fonts.pixel, fontSize: 13, color: colors.white, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0,
  },
  crewNameText: {
    fontFamily: fonts.pixel, fontSize: 9, color: colors.white, opacity: 0.85, textAlign: 'center',
  },
  section1Date: {
    fontFamily: fonts.inter, fontSize: 11, color: colors.white, opacity: 0.7, textAlign: 'center',
  },
  section1Streak: { alignItems: 'center', marginTop: 4 },
  section1StreakNum: {
    fontFamily: fonts.pixel, fontSize: 28, color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  section1StreakLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.white, opacity: 0.8 },

  section2: {
    flex: 62,
    backgroundColor: colors.bg,
    borderTopWidth: 3,
    borderTopColor: colors.white,
  },
  scrollContent: { padding: 16, gap: 0 },

  noSummary: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  noSummaryText: { fontFamily: fonts.pixel, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  noSummaryBody: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  shareCard: {
    backgroundColor: colors.bg,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.pixel,
  },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 24, height: 24 },
  logoText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.accent, letterSpacing: 1 },

  mvpSection: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 12, borderWidth: 2, borderColor: GOLD, backgroundColor: `${GOLD}18`,
  },
  mvpInfo: { flex: 1, gap: 4 },
  mvpBadgeRow: { flexDirection: 'row' },
  mvpName: { fontFamily: fonts.interSemiBold, fontSize: 15, color: colors.text },
  mvpPts: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },

  statsRow: { flexDirection: 'row', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  statBlockBorder: { borderLeftWidth: 2, borderLeftColor: colors.border },
  statNum: { fontFamily: fonts.pixel, fontSize: 20, color: colors.accent },
  statLabel: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, textAlign: 'center' },

  divider: { height: 2, backgroundColor: colors.border },

  taskList: { gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskCheck: {
    width: 18, height: 18,
    backgroundColor: colors.green, borderWidth: 1.5, borderColor: colors.green,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  taskLabel: { flex: 1, fontFamily: fonts.inter, fontSize: 13, color: colors.text },
  taskBadge: {
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  taskBadgeText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.text },

  memberList: { gap: 0 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  memberRowMvp: {
    borderWidth: 2, borderColor: GOLD,
    paddingHorizontal: 8, marginHorizontal: -8,
    backgroundColor: `${GOLD}12`,
  },
  avatarFrame: { overflow: 'hidden', borderWidth: 2, borderColor: colors.border, flexShrink: 0 },
  avatarPlaceholder: {
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontFamily: fonts.interSemiBold, fontSize: 13, color: colors.text },
  memberPts: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  mvpBadge: { paddingHorizontal: 5, paddingVertical: 2, backgroundColor: GOLD, borderWidth: 1, borderColor: GOLD },
  mvpBadgeText: { fontFamily: fonts.pixel, fontSize: 5, color: '#0a0800' },
  inactiveBadge: { paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  inactiveText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },
  completionBox: { width: 26, height: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  completionDone: { borderColor: colors.green, backgroundColor: colors.greenLight },
  completionMiss: { borderColor: colors.red, backgroundColor: colors.redLight },

  btnRow: {
    flexDirection: 'row', gap: 12, padding: 16, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.accent,
  },
  shareBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.white },
  closeBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface,
  },
  closeBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
});
