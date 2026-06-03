import { useState, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, updateUserProfile } from '../lib/firestore';
import { UserProfile } from '../lib/types';
import { getAvatarUrl, generateSeed, hasCustomAvatar } from '../lib/avatar';
import { getAvatarSource } from '../lib/avatarMap';
import { invalidate, getSessionCached, setSessionCached } from '../lib/cache';
import { LoadingScreen } from '../components/LoadingScreen';
import { colors, fonts, shadows } from '../lib/theme';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOALS = [
  { value: 'lose_weight', label: 'LOSE WEIGHT', icon: 'trending-down-outline' as const },
  { value: 'build_muscle', label: 'BUILD MUSCLE', icon: 'barbell-outline' as const },
  { value: 'general_fitness', label: 'GENERAL FITNESS', icon: 'body-outline' as const },
  { value: 'mental_toughness', label: 'MENTAL TOUGHNESS', icon: 'flash-outline' as const },
] as const;

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function SpinPicker({
  value, onInc, onDec, display, onCommit, keyboardType = 'numeric',
}: {
  value: number;
  onInc: () => void;
  onDec: () => void;
  display: string;
  onCommit: (raw: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  return (
    <View style={spinStyles.col}>
      <TouchableOpacity onPress={onInc} style={spinStyles.arrow}>
        <Ionicons name="chevron-up" size={16} color={colors.accent} />
      </TouchableOpacity>
      <View style={spinStyles.valBox}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => { setFocused(true); setDraft(''); }}
          onBlur={() => { setFocused(false); onCommit(draft); }}
          onSubmitEditing={() => onCommit(draft)}
          keyboardType={keyboardType}
          returnKeyType="done"
          selectTextOnFocus
          style={spinStyles.val}
          textAlign="center"
        />
      </View>
      <TouchableOpacity onPress={onDec} style={spinStyles.arrow}>
        <Ionicons name="chevron-down" size={16} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const spinStyles = StyleSheet.create({
  col: { alignItems: 'center', gap: 4, flex: 1 },
  arrow: {
    width: 40, height: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  valBox: {
    width: '100%', paddingVertical: 8, alignItems: 'center',
    borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentLight,
  },
  val: { fontFamily: fonts.vt323, fontSize: 22, color: colors.accent },
});

function DateSpinPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const year = parsed ? parseInt(parsed[1]) : new Date().getFullYear();
  const month = parsed ? parseInt(parsed[2]) : new Date().getMonth() + 1;
  const day = parsed ? parseInt(parsed[3]) : new Date().getDate();

  function update(y: number, m: number, d: number) {
    const maxDay = new Date(y, m, 0).getDate();
    const clampedDay = Math.min(d, maxDay);
    onChange(`${y}-${String(m).padStart(2,'0')}-${String(clampedDay).padStart(2,'0')}`);
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
      <SpinPicker
        value={month}
        display={MONTHS[month - 1]}
        onInc={() => update(year, month === 12 ? 1 : month + 1, day)}
        onDec={() => update(year, month === 1 ? 12 : month - 1, day)}
        keyboardType="numeric"
        onCommit={(raw) => {
          const n = parseInt(raw);
          if (!isNaN(n) && n >= 1 && n <= 12) { update(year, n, day); return; }
          const idx = MONTHS.findIndex((m) => m.toLowerCase() === raw.trim().toLowerCase().slice(0, 3));
          if (idx >= 0) update(year, idx + 1, day);
        }}
      />
      <SpinPicker
        value={day}
        display={String(day).padStart(2, '0')}
        onInc={() => { const max = new Date(year, month, 0).getDate(); update(year, month, day === max ? 1 : day + 1); }}
        onDec={() => { const max = new Date(year, month, 0).getDate(); update(year, month, day === 1 ? max : day - 1); }}
        keyboardType="numeric"
        onCommit={(raw) => {
          const n = parseInt(raw);
          const max = new Date(year, month, 0).getDate();
          if (!isNaN(n) && n >= 1 && n <= max) update(year, month, n);
        }}
      />
      <SpinPicker
        value={year}
        display={String(year)}
        onInc={() => update(year + 1, month, day)}
        onDec={() => update(year - 1, month, day)}
        keyboardType="numeric"
        onCommit={(raw) => {
          const n = parseInt(raw);
          if (!isNaN(n) && n >= 2000 && n <= 2100) update(n, month, day);
        }}
      />
    </View>
  );
}

function OnboardingInner({ profile: initialProfile }: { profile: UserProfile }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [startDate, setStartDate] = useState(initialProfile.challengeStartDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(initialProfile.weightUnit ?? 'lbs');
  const [startingWeight, setStartingWeight] = useState(initialProfile.startingWeight ? String(initialProfile.startingWeight) : '');
  const [height, setHeight] = useState(initialProfile.height ? String(initialProfile.height) : '');
  const [fitnessGoal, setFitnessGoal] = useState<string>(initialProfile.fitnessGoal ?? '');

  const isCustom = hasCustomAvatar(profile);

  async function handleRandomize() {
    setRandomizing(true);
    const seed = generateSeed();
    await updateUserProfile(profile.uid, { dicebearSeed: seed });
    invalidate(`profile-${profile.uid}`);
    const updated = { ...profile, dicebearSeed: seed };
    setProfile(updated);
    setSessionCached('75hard-profile', updated);
    setRandomizing(false);
  }

  async function handleStep2Next() {
    setSaving(true);
    await updateUserProfile(profile.uid, { challengeStartDate: startDate });
    invalidate(`profile-${profile.uid}`);
    const updated = { ...profile, challengeStartDate: startDate };
    setProfile(updated);
    setSessionCached('75hard-profile', updated);
    setSaving(false);
    setStep(3);
  }

  async function handleStep3Next() {
    setSaving(true);
    const updates: Partial<UserProfile> = { weightUnit };
    const w = Number(startingWeight);
    if (startingWeight && !isNaN(w) && w >= 10 && w <= 999) updates.startingWeight = w;
    const h = Number(height);
    if (height && !isNaN(h) && h >= 20 && h <= 300) updates.height = h;
    if (fitnessGoal) updates.fitnessGoal = fitnessGoal as UserProfile['fitnessGoal'];
    await updateUserProfile(profile.uid, updates);
    invalidate(`profile-${profile.uid}`);
    const updated = { ...profile, ...updates };
    setProfile(updated);
    setSessionCached('75hard-profile', updated);
    setSaving(false);
    setStep(4);
  }

  function handleFinish() {
    updateUserProfile(profile.uid, { onboardingComplete: true }).catch(() => {});
    invalidate(`profile-${profile.uid}`);
    const updated = { ...profile, onboardingComplete: true };
    setSessionCached('75hard-profile', updated);
    router.replace('/(tabs)/today');
  }

  const ProgressDots = () => (
    <View style={styles.dots}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[
            styles.dot,
            n === step && styles.dotActive,
            n < step && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );

  // Step 1: Avatar
  if (step === 1) return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <ProgressDots />
      <View style={styles.titleSection}>
        <Text style={styles.welcomeLabel}>WELCOME TO</Text>
        <Text style={styles.title}>75 HARD</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>YOUR AVATAR</Text>
        <View style={styles.avatarFrame}>
          <Image
            source={getAvatarSource(getAvatarUrl(profile))}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.profileName}>{profile.displayName}</Text>
        {!isCustom && (
          <TouchableOpacity
            onPress={handleRandomize}
            disabled={randomizing}
            style={[styles.secondaryBtn, randomizing && { opacity: 0.5 }]}
          >
            <Ionicons name="refresh-outline" size={12} color={colors.text} />
            <Text style={styles.secondaryBtnText}>{randomizing ? 'RANDOMIZING...' : 'RANDOMIZE AVATAR'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setStep(2)} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>NEXT →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Step 2: Start date
  if (step === 2) return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <ProgressDots />
        <Text style={styles.stepTitle}>CHALLENGE START</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>START DATE</Text>
          <DateSpinPicker value={startDate} onChange={setStartDate} />
          <Text style={styles.helperText}>You can change this later in your profile.</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity onPress={() => setStep(1)} style={[styles.secondaryBtn, { flex: 0, paddingHorizontal: 16 }]}>
              <Text style={styles.secondaryBtnText}>← BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStep2Next}
              disabled={saving || !startDate}
              style={[styles.primaryBtn, { flex: 1 }, (saving || !startDate) && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryBtnText}>{saving ? 'SAVING...' : 'NEXT →'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Step 3: Fitness profile
  if (step === 3) return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <ProgressDots />
        <Text style={styles.stepTitle}>FITNESS PROFILE</Text>
        <View style={styles.card}>
          <Text style={styles.helperText}>Optional — helps track your progress throughout the challenge.</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WEIGHT UNIT</Text>
            <View style={styles.typeRow}>
              {(['lbs', 'kg'] as const).map((u) => (
                <TouchableOpacity key={u} onPress={() => setWeightUnit(u)} style={[styles.typeBtn, weightUnit === u && styles.typeBtnActive]}>
                  <Text style={[styles.typeBtnText, weightUnit === u && styles.typeBtnTextActive]}>{u.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>STARTING WEIGHT ({weightUnit})</Text>
            <TextInput
              value={startingWeight}
              onChangeText={setStartingWeight}
              keyboardType="decimal-pad"
              placeholder={`weight in ${weightUnit}`}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>HEIGHT ({weightUnit === 'lbs' ? 'inches' : 'cm'})</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              placeholder={weightUnit === 'lbs' ? 'e.g. 70' : 'e.g. 178'}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>FITNESS GOAL</Text>
            <View style={styles.goalGrid}>
              {GOALS.map(({ value, label, icon }) => {
                const active = fitnessGoal === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setFitnessGoal(active ? '' : value)}
                    style={[styles.goalBtn, active && styles.goalBtnActive]}
                  >
                    <Ionicons name={icon} size={22} color={active ? colors.accent : colors.textMuted} />
                    <Text style={[styles.goalBtnText, active && styles.goalBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={() => setStep(2)} style={[styles.secondaryBtn, { flex: 0, paddingHorizontal: 16 }]}>
              <Text style={styles.secondaryBtnText}>← BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStep3Next}
              disabled={saving}
              style={[styles.primaryBtn, { flex: 1 }, saving && { opacity: 0.5 }]}
            >
              <Text style={styles.primaryBtnText}>{saving ? 'SAVING...' : 'NEXT →'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Step 4: Review + Finish
  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <ProgressDots />
      <Text style={styles.stepTitle}>READY TO START</Text>
      <View style={styles.card}>
        <View style={styles.avatarFrameSmall}>
          <Image source={getAvatarSource(getAvatarUrl(profile))} style={{ width: 80, height: 80 }} resizeMode="cover" />
        </View>
        <Text style={styles.profileName}>{profile.displayName}</Text>

        <View style={styles.reviewRows}>
          {[
            { label: 'START DATE', value: profile.challengeStartDate },
            { label: 'WEIGHT UNIT', value: (profile.weightUnit ?? 'lbs').toUpperCase() },
            ...(profile.startingWeight ? [{ label: 'STARTING WEIGHT', value: `${profile.startingWeight} ${profile.weightUnit ?? 'lbs'}` }] : []),
            ...(profile.fitnessGoal ? [{ label: 'GOAL', value: profile.fitnessGoal.replace('_', ' ').toUpperCase() }] : []),
          ].map(({ label, value }) => (
            <View key={label} style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{label}</Text>
              <Text style={styles.reviewValue}>{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleFinish} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>LET'S GO! →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setStep(3)}>
          <Text style={styles.ghostBtnText}>← BACK</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('75hard-profile'));

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (user && !profile) {
      getUserProfile(user.uid).then((p) => {
        if (p) { setProfile(p); setSessionCached('75hard-profile', p); }
        else router.replace('/login');
      });
    }
  }, [user, authLoading]);

  if (authLoading || !profile) return <LoadingScreen />;
  return <OnboardingInner profile={profile} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
    gap: 24,
    backgroundColor: colors.bg,
  },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: { width: 8, height: 8, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8 },
  dotDone: { backgroundColor: colors.green },
  titleSection: { alignItems: 'center', gap: 8 },
  welcomeLabel: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted, letterSpacing: 2 },
  title: { fontFamily: fonts.pixel, fontSize: 20, color: colors.accent, lineHeight: 30, textShadowColor: 'rgba(232, 100, 58, 0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  stepTitle: { fontFamily: fonts.pixel, fontSize: 12, color: colors.accent, textAlign: 'center' },
  card: {
    width: '100%',
    padding: 24,
    gap: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  cardLabel: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  avatarFrame: {
    width: 120, height: 120,
    borderWidth: 3, borderColor: colors.accent,
    overflow: 'hidden',
    ...shadows.glowAccent,
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  avatarFrameSmall: {
    width: 80, height: 80,
    borderWidth: 2, borderColor: colors.accent,
    overflow: 'hidden',
    ...shadows.glowAccent,
  },
  avatarImg: { width: 120, height: 120 },
  profileName: { fontFamily: fonts.vt323, fontSize: 26, color: colors.text },
  primaryBtn: {
    width: '100%', paddingVertical: 12,
    borderWidth: 2, borderColor: colors.accent,
    backgroundColor: colors.accent, alignItems: 'center',
    ...shadows.pixel, ...shadows.glowAccent,
  },
  primaryBtnText: { fontFamily: fonts.pixel, fontSize: 9, color: colors.white },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  secondaryBtnText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted },
  ghostBtnText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, paddingVertical: 8 },
  btnRow: { flexDirection: 'row', gap: 8, width: '100%' },
  field: { width: '100%', gap: 8 },
  fieldLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  input: {
    width: '100%', padding: 12,
    fontFamily: fonts.inter, fontSize: 16,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.bg, color: colors.text,
    borderRadius: 0,
  },
  helperText: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted, lineHeight: 20, textAlign: 'center' },
  typeRow: { flexDirection: 'row', gap: 8, width: '100%' },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderWidth: 2,
    borderColor: colors.border, backgroundColor: colors.surface2, alignItems: 'center', ...shadows.pixel,
  },
  typeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight, ...shadows.glowAccent },
  typeBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  typeBtnTextActive: { color: colors.accent },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  goalBtn: {
    width: '47%', paddingVertical: 16, alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2, ...shadows.pixel,
  },
  goalBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight, ...shadows.glowAccent },
  goalBtnText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, textAlign: 'center' },
  goalBtnTextActive: { color: colors.accent },
  reviewRows: { width: '100%', gap: 8 },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  reviewLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  reviewValue: { fontFamily: fonts.vt323, fontSize: 18, color: colors.text },
});
