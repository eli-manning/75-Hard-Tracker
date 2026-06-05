import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signIn, signUp, sendPasswordReset } from '../lib/auth';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAuth } from '../hooks/useAuth';
import { LoadingScreen } from '../components/LoadingScreen';
import { colors, fonts, shadows } from '../lib/theme';

type Mode = 'login' | 'signup';

const ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'No account with that email.',
  'auth/email-already-in-use': 'Email already registered. Sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
};

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const signingUpRef = useRef(false);

  const { trigger: triggerGoogle, loading: googleSubmitting } = useGoogleAuth((result) => {
    if ('error' in result) {
      setError(result.error);
    } else {
      signingUpRef.current = true;
      if (result.isNewUser) {
        router.replace('/onboarding' as any);
      } else {
        router.replace('/(tabs)/today');
      }
    }
  });

  useEffect(() => {
    if (!authLoading && user && !signingUpRef.current) router.replace('/(tabs)/today');
  }, [user, authLoading, router]);

  if (authLoading) return <LoadingScreen />;
  if (user) return <LoadingScreen />;

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) { setError('Enter your name.'); setSubmitting(false); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); setSubmitting(false); return; }
        signingUpRef.current = true;
        await signUp(email, password, displayName);
        router.replace('/onboarding' as any);
        return;
      } else {
        await signIn(email, password);
      }
      router.replace('/(tabs)/today');
    } catch (err: unknown) {
      signingUpRef.current = false;
      const code = (err as { code?: string }).code ?? '';
      setError(ERROR_MAP[code] ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setError('');
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(ERROR_MAP[code] ?? 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>CrewDay</Text>
          <Text style={styles.subtitle}>Your crew. Your goals. Every day.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {resetMode ? (
            /* ── Forgot Password ── */
            <>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>RESET PASSWORD</Text>
              </View>
              {resetSent ? (
                <View style={styles.cardBody}>
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>Check your email for a reset link.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setResetMode(false); setResetSent(false); setError(''); }}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnText}>BACK TO SIGN IN</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cardBody}>
                  <Text style={styles.bodyText}>Enter your email and we'll send a reset link.</Text>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>EMAIL</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>
                  {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
                  <TouchableOpacity
                    onPress={handlePasswordReset}
                    disabled={submitting}
                    style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                  >
                    <Text style={styles.primaryBtnText}>{submitting ? 'SENDING...' : 'SEND RESET LINK'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setResetMode(false); setError(''); }}>
                    <Text style={styles.ghostBtnText}>BACK TO SIGN IN</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            /* ── Login / Signup ── */
            <>
              {/* Mode tabs */}
              <View style={styles.modeTabs}>
                {(['login', 'signup'] as Mode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => { setMode(m); setError(''); setConfirmPassword(''); }}
                    style={[styles.modeTab, mode === m && styles.modeTabActive]}
                  >
                    <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                      {m === 'login' ? 'SIGN IN' : 'SIGN UP'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.cardBody}>
                {mode === 'signup' && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>NAME</Text>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="First Last"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {mode === 'login' && (
                    <TouchableOpacity onPress={() => { setResetMode(true); setError(''); }}>
                      <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {mode === 'signup' && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        placeholderTextColor={colors.textMuted}
                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword((v) => !v)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                >
                  <Text style={styles.primaryBtnText}>
                    {submitting ? 'LOADING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  onPress={triggerGoogle}
                  disabled={googleSubmitting}
                  style={[styles.googleBtn, googleSubmitting && styles.btnDisabled]}
                >
                  <Text style={styles.googleBtnG}>G</Text>
                  <Text style={styles.googleBtnText}>
                    {googleSubmitting ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 24,
  },
  titleSection: { alignItems: 'center', gap: 8 },
  title: {
    fontFamily: fonts.pixel,
    fontSize: 24,
    color: colors.accent,
    lineHeight: 36,
    textShadowColor: 'colors.accentGlow',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 3,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  cardHeaderText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.accent },
  cardBody: { padding: 20, gap: 16 },
  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  modeTabActive: { backgroundColor: colors.accentLight },
  modeTabText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  modeTabTextActive: { color: colors.accent },
  field: { gap: 4 },
  fieldLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  input: {
    width: '100%',
    padding: 12,
    fontFamily: fonts.inter,
    fontSize: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 0,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  forgotText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
    paddingTop: 4,
  },
  errorBox: {
    borderWidth: 2,
    borderColor: colors.red,
    backgroundColor: colors.redLight,
    padding: 10,
  },
  errorText: { fontFamily: fonts.inter, fontSize: 13, color: colors.red, lineHeight: 20 },
  successBox: {
    borderWidth: 2,
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
    padding: 10,
  },
  successText: { fontFamily: fonts.inter, fontSize: 13, color: colors.green, lineHeight: 20 },
  primaryBtn: {
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    alignItems: 'center',
    ...shadows.pixel,
    ...shadows.glowAccent,
  },
  primaryBtnText: { fontFamily: fonts.pixel, fontSize: 9, color: colors.white },
  secondaryBtn: {
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.text },
  btnDisabled: { opacity: 0.5 },
  bodyText: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  ghostBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  googleBtnG: {
    fontFamily: fonts.inter,
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.text,
  },
});
