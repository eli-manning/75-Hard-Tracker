import { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { subscribeToProfile, updateUserProfile, getUserProfile } from '../lib/firestore';
import { UserProfile } from '../lib/types';
import { getAvatarUrl, generateSeed, hasCustomAvatar } from '../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../lib/avatarMap';
import { invalidate, getSessionCached } from '../lib/cache';
import { LoadingScreen } from '../components/LoadingScreen';
import { NotificationSettings } from '../components/NotificationSettings';
import { RestartModal } from '../components/RestartModal';
import { StreakFlame } from '../components/StreakFlame';
import { colors, fonts, shadows } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Draft {
  displayName: string;
  challengeStartDate: string | null;
  challengeMode: 'general' | '75hard';
  leaderboardOptOut: boolean;
  dicebearSeed?: string;
  notifAllEnabled?: boolean;
  notifDailyEnabled?: boolean;
  notifDailyTime?: string;
  notifNudgesEnabled?: boolean;
  notifFriendRequestsEnabled?: boolean;
}

function makeDraft(p: UserProfile): Draft {
  return {
    displayName: p.displayName,
    challengeStartDate: p.challengeStartDate,
    challengeMode: p.challengeMode ?? 'general',
    leaderboardOptOut: p.leaderboardOptOut !== false,
    dicebearSeed: p.dicebearSeed,
    notifAllEnabled: p.notifAllEnabled,
    notifDailyEnabled: p.notifDailyEnabled,
    notifDailyTime: p.notifDailyTime,
    notifNudgesEnabled: p.notifNudgesEnabled,
    notifFriendRequestsEnabled: p.notifFriendRequestsEnabled,
  };
}

function isDraftDirty(draft: Draft, profile: UserProfile): boolean {
  return (
    draft.displayName !== profile.displayName ||
    draft.challengeStartDate !== profile.challengeStartDate ||
    draft.challengeMode !== (profile.challengeMode ?? 'general') ||
    draft.leaderboardOptOut !== (profile.leaderboardOptOut !== false) ||
    draft.dicebearSeed !== profile.dicebearSeed ||
    draft.notifAllEnabled !== profile.notifAllEnabled ||
    draft.notifDailyEnabled !== profile.notifDailyEnabled ||
    draft.notifDailyTime !== profile.notifDailyTime ||
    draft.notifNudgesEnabled !== profile.notifNudgesEnabled ||
    draft.notifFriendRequestsEnabled !== profile.notifFriendRequestsEnabled
  );
}

function ProfileInner({ currentUser }: { currentUser: UserProfile }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(currentUser);
  const [draft, setDraft] = useState<Draft>(() => makeDraft(currentUser));
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.displayName);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState(currentUser.challengeStartDate ?? '');
  const [saving, setSaving] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToProfile(profile.uid, (fresh) => setProfile(fresh));
    return unsub;
  }, [profile.uid]);

  // Merged profile used for display and child components — shows draft values
  const draftProfile: UserProfile = {
    ...profile,
    displayName: draft.displayName,
    challengeStartDate: draft.challengeStartDate,
    challengeMode: draft.challengeMode,
    leaderboardOptOut: draft.leaderboardOptOut,
    dicebearSeed: draft.dicebearSeed,
    notifAllEnabled: draft.notifAllEnabled,
    notifDailyEnabled: draft.notifDailyEnabled,
    notifDailyTime: draft.notifDailyTime,
    notifNudgesEnabled: draft.notifNudgesEnabled,
    notifFriendRequestsEnabled: draft.notifFriendRequestsEnabled,
  };

  const dirty = isDraftDirty(draft, profile);

  function commitName() {
    const trimmed = nameInput.trim().slice(0, 100);
    if (trimmed) setDraft((d) => ({ ...d, displayName: trimmed }));
    else setNameInput(draft.displayName);
    setEditingName(false);
  }

  function commitStart() {
    if (startInput) setDraft((d) => ({ ...d, challengeStartDate: startInput }));
    else setStartInput(draft.challengeStartDate);
    setEditingStart(false);
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const changes: Partial<UserProfile> = {};
      if (draft.displayName !== profile.displayName) changes.displayName = draft.displayName;
      if (draft.challengeStartDate !== profile.challengeStartDate) changes.challengeStartDate = draft.challengeStartDate;
      if (draft.challengeMode !== (profile.challengeMode ?? 'general')) changes.challengeMode = draft.challengeMode;
      if (draft.leaderboardOptOut !== (profile.leaderboardOptOut !== false)) changes.leaderboardOptOut = draft.leaderboardOptOut;
      if (draft.dicebearSeed !== profile.dicebearSeed) changes.dicebearSeed = draft.dicebearSeed;
      if (draft.notifAllEnabled !== profile.notifAllEnabled) changes.notifAllEnabled = draft.notifAllEnabled;
      if (draft.notifDailyEnabled !== profile.notifDailyEnabled) changes.notifDailyEnabled = draft.notifDailyEnabled;
      if (draft.notifDailyTime !== profile.notifDailyTime) changes.notifDailyTime = draft.notifDailyTime;
      if (draft.notifNudgesEnabled !== profile.notifNudgesEnabled) changes.notifNudgesEnabled = draft.notifNudgesEnabled;
      if (draft.notifFriendRequestsEnabled !== profile.notifFriendRequestsEnabled) changes.notifFriendRequestsEnabled = draft.notifFriendRequestsEnabled;

      await updateUserProfile(profile.uid, changes);
      invalidate('all-users');
      invalidate(`profile-${profile.uid}`);
      setProfile((p) => ({ ...p, ...changes }));
    } catch {
      // keep dirty state, user can retry
    } finally {
      setSaving(false);
    }
  }

  const [avatarErr, setAvatarErr] = useState(false);
  useEffect(() => setAvatarErr(false), [draft.dicebearSeed]);
  const isCustom = hasCustomAvatar(draftProfile);
  const avatarUrl = getAvatarUrl(draftProfile);
  const avatarRatio = AVATAR_PORTRAIT_RATIO[avatarUrl];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + (dirty ? 120 : 60) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={16} color={colors.accent} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>MY PROFILE</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarFrame}>
              {avatarErr ? (
                <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person-outline" size={56} color={colors.textMuted} />
                </View>
              ) : (
                <Image
                  source={getAvatarSource(avatarUrl)}
                  style={{ width: 120, height: avatarRatio ? 120 / avatarRatio : 120 }}
                  resizeMode={avatarRatio ? 'stretch' : 'cover'}
                  onError={() => setAvatarErr(true)}
                />
              )}
            </View>
            <StreakFlame streak={profile.currentStreak ?? 0} size="lg" />
          </View>
          {!isCustom && (
            <TouchableOpacity
              onPress={() => setDraft((d) => ({ ...d, dicebearSeed: generateSeed() }))}
              style={styles.randomizeBtn}
            >
              <Ionicons name="refresh-outline" size={12} color={colors.textMuted} />
              <Text style={styles.randomizeBtnText}>RANDOMIZE</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                style={[styles.editInput, { flex: 1 }]}
                placeholderTextColor={colors.textMuted}
                onBlur={commitName}
                onSubmitEditing={commitName}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={commitName} style={styles.iconBtn}>
                <Ionicons name="checkmark" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.displayRow}>
              <Text style={[styles.displayValue, draft.displayName !== profile.displayName && styles.pendingValue]}>
                {draft.displayName}
              </Text>
              <TouchableOpacity onPress={() => { setNameInput(draft.displayName); setEditingName(true); }} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Email */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <Text style={styles.displayValue}>{profile.email}</Text>
        </View>

        {/* Challenge start date — 75 Hard only */}
        {draft.challengeMode === '75hard' && (
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>CHALLENGE START DATE</Text>
            {editingStart ? (
              <View style={styles.editRow}>
                <TextInput
                  value={startInput}
                  onChangeText={setStartInput}
                  autoFocus
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.editInput, { flex: 1 }]}
                  onBlur={commitStart}
                  onSubmitEditing={commitStart}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={commitStart} style={styles.iconBtn}>
                  <Ionicons name="checkmark" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.displayRow}>
                <Text style={[styles.displayValue, draft.challengeStartDate !== profile.challengeStartDate && styles.pendingValue]}>
                  {draft.challengeStartDate ?? '—'}
                </Text>
                <TouchableOpacity onPress={() => { setStartInput(draft.challengeStartDate ?? ''); setEditingStart(true); }} style={styles.iconBtn}>
                  <Ionicons name="pencil-outline" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Challenge mode */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>CHALLENGE MODE</Text>
          <View style={styles.displayRow}>
            <Text style={[styles.displayValue, draft.challengeMode !== (profile.challengeMode ?? 'general') && styles.pendingValue]}>
              {draft.challengeMode === '75hard' ? '75 HARD MODE' : 'GENERAL FITNESS'}
            </Text>
            <TouchableOpacity
              onPress={() => setDraft((d) => ({ ...d, challengeMode: d.challengeMode === '75hard' ? 'general' : '75hard' }))}
              style={styles.iconBtn}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.currentStreak}</Text>
            <Text style={styles.statLabel}>CURRENT STREAK</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.longestStreak}</Text>
            <Text style={styles.statLabel}>LONGEST STREAK</Text>
          </View>
        </View>

        {/* Leaderboard privacy */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>LEADERBOARD</Text>
          <View style={styles.displayRow}>
            <Text style={[styles.displayValue, draft.leaderboardOptOut !== (profile.leaderboardOptOut !== false) && styles.pendingValue]}>
              {draft.leaderboardOptOut ? 'OPTED OUT' : 'VISIBLE TO ALL'}
            </Text>
            <TouchableOpacity
              onPress={() => setDraft((d) => ({ ...d, leaderboardOptOut: !d.leaderboardOptOut }))}
              style={styles.iconBtn}
            >
              <Ionicons
                name={draft.leaderboardOptOut ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={draft.leaderboardOptOut ? colors.textMuted : colors.accent}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications — updates draft, saved with everything else */}
        <NotificationSettings
          profile={draftProfile}
          onUpdate={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        />

        {/* Fitness info */}
        {(profile.startingWeight || profile.fitnessGoal) && (
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>FITNESS PROFILE</Text>
            {profile.startingWeight && (
              <Text style={styles.displayValue}>
                Starting: {profile.startingWeight} {profile.weightUnit ?? 'lbs'}
              </Text>
            )}
            {profile.fitnessGoal && (
              <Text style={[styles.displayValue, { marginTop: 4 }]}>
                Goal: {profile.fitnessGoal.replace('_', ' ').toUpperCase()}
              </Text>
            )}
          </View>
        )}



        {/* Danger zone */}
        {(draft.challengeMode ?? 'general') === '75hard' && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerLabel}>DANGER ZONE</Text>
            <TouchableOpacity onPress={() => setShowRestartModal(true)} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnText}>FAILED THE CHALLENGE</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sticky save bar */}
      {dirty && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            onPress={handleSaveAll}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
          </TouchableOpacity>
        </View>
      )}

      <RestartModal
        visible={showRestartModal}
        onConfirm={async ({ keepPoints, keepLongestStreak }) => {
          const { format: fmt } = await import('date-fns');
          const { clearAll } = await import('../lib/cache');
          const newStartDate = fmt(new Date(), 'yyyy-MM-dd');
          await updateUserProfile(profile.uid, {
            challengeStartDate: newStartDate,
            currentStreak: 0,
            ...(keepLongestStreak ? {} : { longestStreak: 0 }),
            ...(keepPoints ? {} : { totalPoints: 0 }),
          });
          clearAll();
          setShowRestartModal(false);
          setProfile((p) => ({
            ...p,
            challengeStartDate: newStartDate,
            currentStreak: 0,
            ...(keepLongestStreak ? {} : { longestStreak: 0 }),
            ...(keepPoints ? {} : { totalPoints: 0 }),
          }));
          setDraft((d) => ({ ...d, challengeStartDate: newStartDate }));
        }}
        onCancel={() => setShowRestartModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('crewday-profile'));

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (user && !profile) {
      getUserProfile(user.uid).then((p) => {
        if (p) setProfile(p);
      }).catch(() => {});
    }
  }, [user, authLoading]);

  if (authLoading || !profile) return <LoadingScreen />;
  return <ProfileInner currentUser={profile} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  pageTitle: { fontFamily: fonts.pixel, fontSize: 14, color: colors.accent, marginBottom: 8 },
  avatarSection: { alignItems: 'center', gap: 12 },
  avatarWrapper: { position: 'relative' },
  avatarFrame: {
    width: 120, height: 120,
    borderWidth: 3, borderColor: colors.accent,
    overflow: 'hidden',
    ...shadows.glowAccent,
  },
  randomizeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  randomizeBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  fieldCard: {
    padding: 16, gap: 8,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  fieldLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  displayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  displayValue: { fontFamily: fonts.vt323, fontSize: 22, color: colors.text, flex: 1 },
  pendingValue: { color: colors.accent },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: {
    fontFamily: fonts.vt323, fontSize: 22,
    borderWidth: 2, borderColor: colors.accent,
    backgroundColor: colors.surface2, color: colors.text,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  iconBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  statValue: { fontFamily: fonts.pixel, fontSize: 20, color: colors.accent },
  statLabel: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, textAlign: 'center' },
  dangerZone: {
    padding: 16, gap: 12,
    borderWidth: 2, borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  dangerLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.red },
  dangerBtn: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 2, borderColor: colors.red,
    alignItems: 'center',
  },
  dangerBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.red },
  saveBar: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 2, borderTopColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixelUp,
  },
  saveBtn: {
    paddingVertical: 16,
    borderWidth: 2, borderColor: colors.accent,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: fonts.pixel, fontSize: 9, color: colors.white },
});
