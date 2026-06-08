import React, { useRef } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Platform, Share,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, parseISO } from 'date-fns';
import { colors, fonts, shadows } from '../lib/theme';
import { DayEntry, UserProfile } from '../lib/types';
import { getAvatarUrl } from '../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../lib/avatarMap';

const GOLD = '#f0c040';

const CORE_TASK_ENTRIES: { key: keyof NonNullable<UserProfile['hiddenCoreTasks']>; label: string }[] = [
  { key: 'workout1', label: 'Workout #1 — 45 min' },
  { key: 'workout2', label: 'Workout #2 — Outdoor' },
  { key: 'diet',    label: 'No cheat meals today' },
  { key: 'water',   label: 'Drink 1 gallon of water' },
  { key: 'reading', label: 'Read 10 pages' },
  { key: 'photo',   label: 'Progress photo' },
];

async function captureAndShare(ref: React.RefObject<View>) {
  if (Platform.OS === 'web') return;
  try {
    const rnViewShot = require('react-native-view-shot');
    const uri: string = await rnViewShot.captureRef(ref, { format: 'png', quality: 1 });
    await Share.share({
      url: uri,
      message: 'Day complete on CrewDay. Your crew. Your goals. Every day.',
    });
  } catch (e) {
    console.error('[DaySummaryModal] capture/share failed:', e);
  }
}

function MemberAvatar({ profile, size }: { profile: UserProfile; size: number }) {
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
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

interface DaySummaryModalProps {
  visible: boolean;
  onDismiss: () => void;
  dayEntry: DayEntry;
  userProfile: UserProfile;
  date: string; // YYYY-MM-DD
}

export function DaySummaryModal({ visible, onDismiss, dayEntry, userProfile, date }: DaySummaryModalProps) {
  const cardRef = useRef<View>(null);

  const dayNum = userProfile.challengeStartDate
    ? differenceInDays(parseISO(date), parseISO(userProfile.challengeStartDate)) + 1
    : 0;

  const dateFormatted = format(parseISO(date), 'MMMM d, yyyy').toUpperCase();
  const pts = dayEntry.dailyPoints ?? 0;
  const streak = userProfile.currentStreak ?? 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        {/* Section 1 — Celebration header */}
        <View style={styles.section1}>
          <Text style={styles.dayCompleteText}>DAY COMPLETE</Text>
          {dayNum > 0 && <Text style={styles.dayNumText}>DAY {dayNum}</Text>}
          <Text style={styles.dateText}>{dateFormatted}</Text>
        </View>

        {/* Section 2 — Stats */}
        <View style={styles.section2}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Shareable card — captured by react-native-view-shot */}
            <View ref={cardRef} style={styles.shareCard}>
              {/* Logo row */}
              <View style={styles.logoRow}>
                <Image
                  source={require('../assets/icon.png')}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>CREWDAY</Text>
              </View>

              {/* Avatar + display name */}
              <View style={styles.avatarSection}>
                <MemberAvatar profile={userProfile} size={64} />
                <Text style={styles.displayName} numberOfLines={1}>{userProfile.displayName}</Text>
              </View>

              {/* Points + streak */}
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNum}>{pts}</Text>
                  <Text style={styles.statLabel}>PTS TODAY</Text>
                </View>
                <View style={[styles.statBlock, styles.statBlockRight]}>
                  <Text style={[styles.statNum, { color: colors.accent }]}>{streak}</Text>
                  <Text style={styles.statLabel}>DAY STREAK</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Task completion list */}
              <View style={styles.taskList}>
                {CORE_TASK_ENTRIES
                  .filter(({ key }) => {
                    if (userProfile.challengeMode !== 'general') return true;
                    return !userProfile.hiddenCoreTasks?.[key];
                  })
                  .map(({ label }) => (
                    <View key={label} style={styles.taskRow}>
                      <View style={styles.taskCheckbox}>
                        <Svg width={10} height={8} viewBox="0 0 12 10" fill="none">
                          <Path d="M1 5l3 3 7-7" stroke={colors.bg} strokeWidth={2.5} strokeLinecap="square" />
                        </Svg>
                      </View>
                      <Text style={styles.taskLabel}>{label}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </ScrollView>

          {/* Buttons — outside ViewShot capture area */}
          <View style={styles.btnRow}>
            {Platform.OS !== 'web' && (
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
              style={[styles.closeBtn, Platform.OS === 'web' && { flex: 1 }]}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.accent },

  // Section 1 — accent celebration area
  section1: {
    flex: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: colors.accent,
  },
  dayCompleteText: {
    fontFamily: fonts.pixel,
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  dayNumText: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
  },
  dateText: {
    fontFamily: fonts.inter,
    fontSize: 12,
    color: colors.white,
    opacity: 0.7,
    textAlign: 'center',
  },

  // Section 2 — cream stats area
  section2: {
    flex: 79,
    backgroundColor: colors.bg,
    borderTopWidth: 3,
    borderTopColor: colors.white,
  },
  scrollContent: { padding: 20, paddingBottom: 8 },

  // Shareable card
  shareCard: {
    backgroundColor: colors.bg,
    padding: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.pixel,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 28, height: 28 },
  logoText: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.accent,
    letterSpacing: 1,
  },

  avatarSection: { alignItems: 'center', gap: 10 },
  avatarFrame: { overflow: 'hidden', borderWidth: 2, borderColor: colors.border },
  avatarPlaceholder: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statBlockRight: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  statNum: {
    fontFamily: fonts.pixel,
    fontSize: 22,
    color: colors.text,
  },
  statLabel: {
    fontFamily: fonts.pixel,
    fontSize: 5,
    color: colors.textMuted,
    textAlign: 'center',
  },

  divider: {
    height: 2,
    backgroundColor: colors.border,
  },

  taskList: { gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskCheckbox: {
    width: 18,
    height: 18,
    backgroundColor: colors.green,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskLabel: {
    fontFamily: fonts.inter,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  shareBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.white,
  },
  closeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.textMuted,
  },
});
