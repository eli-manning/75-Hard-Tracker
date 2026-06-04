import { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { subscribeToProfile, updateUserProfile } from '../lib/firestore';
import { UserProfile } from '../lib/types';
import { getAvatarUrl, generateSeed, hasCustomAvatar } from '../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../lib/avatarMap';
import { invalidate, getSessionCached } from '../lib/cache';
import { LoadingScreen } from '../components/LoadingScreen';
import { NotificationSettings } from '../components/NotificationSettings';
import { RestartModal } from '../components/RestartModal';
import { colors, fonts, shadows } from '../lib/theme';
import { format, parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ProfileInner({ currentUser }: { currentUser: UserProfile }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(currentUser);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [editingStart, setEditingStart] = useState(false);
  const [startInput, setStartInput] = useState(profile.challengeStartDate);
  const [saving, setSaving] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToProfile(profile.uid, (fresh) => setProfile(fresh));
    return unsub;
  }, [profile.uid]);

  async function handleSaveName() {
    const trimmed = nameInput.trim().slice(0, 100);
    if (!trimmed || trimmed === profile.displayName) { setEditingName(false); return; }
    setSaving(true);
    await updateUserProfile(profile.uid, { displayName: trimmed });
    invalidate('all-users');
    invalidate(`profile-${profile.uid}`);
    setSaving(false);
    setEditingName(false);
    setProfile((p) => ({ ...p, displayName: trimmed }));
  }

  async function handleSaveStart() {
    if (!startInput || startInput === profile.challengeStartDate) { setEditingStart(false); return; }
    setSaving(true);
    await updateUserProfile(profile.uid, { challengeStartDate: startInput });
    invalidate(`profile-${profile.uid}`);
    setSaving(false);
    setEditingStart(false);
    setProfile((p) => ({ ...p, challengeStartDate: startInput }));
  }

  async function handleRandomize() {
    setRandomizing(true);
    const seed = generateSeed();
    await updateUserProfile(profile.uid, { dicebearSeed: seed });
    invalidate(`profile-${profile.uid}`);
    setProfile((p) => ({ ...p, dicebearSeed: seed }));
    setRandomizing(false);
  }

  const isCustom = hasCustomAvatar(profile);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
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
          <View style={styles.avatarFrame}>
            {(() => {
              const url = getAvatarUrl(profile);
              const ratio = AVATAR_PORTRAIT_RATIO[url];
              return (
                <Image
                  source={getAvatarSource(url)}
                  style={{ width: 120, height: ratio ? 120 / ratio : 120 }}
                  resizeMode={ratio ? 'stretch' : 'cover'}
                />
              );
            })()}
          </View>
          {!isCustom && (
            <TouchableOpacity
              onPress={handleRandomize}
              disabled={randomizing}
              style={[styles.randomizeBtn, randomizing && { opacity: 0.5 }]}
            >
              <Ionicons name="refresh-outline" size={12} color={colors.textMuted} />
              <Text style={styles.randomizeBtnText}>{randomizing ? 'RANDOMIZING...' : 'RANDOMIZE'}</Text>
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
              />
              <TouchableOpacity onPress={handleSaveName} disabled={saving} style={styles.iconBtn}>
                <Ionicons name="checkmark" size={16} color={colors.green} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.displayRow}>
              <Text style={styles.displayValue}>{profile.displayName}</Text>
              <TouchableOpacity onPress={() => { setNameInput(profile.displayName); setEditingName(true); }} style={styles.iconBtn}>
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

        {/* Challenge start date */}
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
              />
              <TouchableOpacity onPress={handleSaveStart} disabled={saving} style={styles.iconBtn}>
                <Ionicons name="checkmark" size={16} color={colors.green} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.displayRow}>
              <Text style={styles.displayValue}>{profile.challengeStartDate}</Text>
              <TouchableOpacity onPress={() => { setStartInput(profile.challengeStartDate); setEditingStart(true); }} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Challenge mode */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>CHALLENGE MODE</Text>
          <View style={styles.displayRow}>
            <Text style={styles.displayValue}>
              {(profile.challengeMode ?? 'general') === '75hard' ? '75 HARD MODE' : 'GENERAL FITNESS'}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                const newMode = (profile.challengeMode ?? 'general') === '75hard' ? 'general' : '75hard';
                await updateUserProfile(profile.uid, { challengeMode: newMode });
                setProfile((p) => ({ ...p, challengeMode: newMode }));
              }}
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
            <Text style={styles.displayValue}>
              {profile.leaderboardOptOut !== false ? 'OPTED OUT' : 'VISIBLE TO ALL'}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                const next = profile.leaderboardOptOut !== false;
                await updateUserProfile(profile.uid, { leaderboardOptOut: !next });
                setProfile((p) => ({ ...p, leaderboardOptOut: !next }));
              }}
              style={styles.iconBtn}
            >
              <Ionicons
                name={profile.leaderboardOptOut !== false ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={profile.leaderboardOptOut !== false ? colors.textMuted : colors.accent}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <NotificationSettings
          profile={profile}
          onUpdate={async (patch) => {
            await updateUserProfile(profile.uid, patch);
            setProfile((p) => ({ ...p, ...patch }));
          }}
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
        {(profile.challengeMode ?? 'general') === '75hard' && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerLabel}>DANGER ZONE</Text>
            <TouchableOpacity
              onPress={() => setShowRestartModal(true)}
              style={styles.dangerBtn}
            >
              <Text style={styles.dangerBtnText}>FAILED THE CHALLENGE</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <RestartModal
        visible={showRestartModal}
        onConfirm={async ({ keepPoints, keepLongestStreak }) => {
          const { format: fmt } = await import('date-fns');
          const { clearAll } = await import('../lib/cache');
          await updateUserProfile(profile.uid, {
            challengeStartDate: fmt(new Date(), 'yyyy-MM-dd'),
            currentStreak: 0,
            ...(keepLongestStreak ? {} : { longestStreak: 0 }),
            ...(keepPoints ? {} : { totalPoints: 0 }),
          });
          clearAll();
          setShowRestartModal(false);
          setProfile((p) => ({ ...p, challengeStartDate: fmt(new Date(), 'yyyy-MM-dd'), currentStreak: 0 }));
        }}
        onCancel={() => setShowRestartModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('75hard-profile'));

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (user && !profile) {
      const { getUserProfile } = require('../lib/firestore');
      getUserProfile(user.uid).then((p: UserProfile | null) => {
        if (p) setProfile(p);
      });
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
  avatarFrame: {
    width: 120, height: 120,
    borderWidth: 3, borderColor: colors.accent,
    overflow: 'hidden',
    ...shadows.glowAccent,
  },
  avatar: { width: 120, height: 120 },
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
});
