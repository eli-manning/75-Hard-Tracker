'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getUserProfile, updateUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';
import { getAvatarUrl, generateSeed, hasCustomAvatar } from '@/lib/avatar';
import { invalidate, getSessionCached, setSessionCached } from '@/lib/cache';
import { AuthGuard } from '@/components/AuthGuard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { RefreshCw, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { format } from 'date-fns';

const GOALS = [
  { value: 'lose_weight', emoji: '🔥', label: 'LOSE WEIGHT' },
  { value: 'build_muscle', emoji: '💪', label: 'BUILD MUSCLE' },
  { value: 'general_fitness', emoji: '❤️', label: 'GENERAL FITNESS' },
  { value: 'mental_toughness', emoji: '🧠', label: 'MENTAL TOUGHNESS' },
] as const;

function OnboardingInner({ profile: initialProfile }: { profile: UserProfile }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [randomizing, setRandomizing] = useState(false);

  // Step 2
  const [startDate, setStartDate] = useState(initialProfile.challengeStartDate ?? format(new Date(), 'yyyy-MM-dd'));

  // Step 3
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(initialProfile.weightUnit ?? 'lbs');
  const [startingWeight, setStartingWeight] = useState(initialProfile.startingWeight ? String(initialProfile.startingWeight) : '');
  const [height, setHeight] = useState(initialProfile.height ? String(initialProfile.height) : '');
  const [fitnessGoal, setFitnessGoal] = useState<string>(initialProfile.fitnessGoal ?? '');

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

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
    if (startingWeight && !isNaN(Number(startingWeight))) {
      updates.startingWeight = Number(startingWeight);
    }
    if (height && !isNaN(Number(height))) {
      updates.height = Number(height);
    }
    if (fitnessGoal) {
      updates.fitnessGoal = fitnessGoal as UserProfile['fitnessGoal'];
    }
    await updateUserProfile(profile.uid, updates);
    invalidate(`profile-${profile.uid}`);
    const updated = { ...profile, ...updates };
    setProfile(updated);
    setSessionCached('75hard-profile', updated);
    setSaving(false);
    setStep(4);
  }

  async function handleFinish() {
    setSaving(true);
    await updateUserProfile(profile.uid, { onboardingComplete: true });
    invalidate(`profile-${profile.uid}`);
    const updated = { ...profile, onboardingComplete: true };
    setSessionCached('75hard-profile', updated);
    router.replace('/today');
  }


  const progressDots = (
    <div className="flex gap-2 justify-center mb-8">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} style={{
          width: 8, height: 8,
          background: n === step ? 'var(--accent)' : n < step ? 'var(--green)' : 'var(--border)',
          boxShadow: n === step ? 'var(--glow-accent)' : 'none',
          transition: 'all 200ms',
        }} />
      ))}
    </div>
  );

  const cardStyle = {
    background: 'var(--surface)',
    border: '2px solid var(--border)',
    boxShadow: '4px 4px 0 #000',
  };

  const btnPrimary: React.CSSProperties = {
    ...pixelFont,
    fontSize: '9px',
    padding: '12px 20px',
    border: '2px solid var(--accent)',
    boxShadow: '3px 3px 0 #000',
    background: 'var(--accent)',
    color: '#fff',
    cursor: 'pointer',
    width: '100%',
  };

  const btnSecondary: React.CSSProperties = {
    ...pixelFont,
    fontSize: '8px',
    padding: '10px 16px',
    border: '2px solid var(--border)',
    boxShadow: '2px 2px 0 #000',
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    border: '2px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
  };

  // ── Step 1: Welcome & Avatar ──────────────────────────────────────────────
  if (step === 1) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {progressDots}
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>WELCOME TO</p>
          <h1 style={{ ...pixelFont, fontSize: '20px', color: 'var(--accent)', textShadow: 'var(--glow-accent)', lineHeight: 1.5 }}>
            75 HARD
          </h1>
        </div>

        <div style={cardStyle} className="p-6 flex flex-col items-center gap-5">
          <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>YOUR AVATAR</p>

          <div style={{
            width: 120, height: 120,
            border: '3px solid var(--accent)',
            boxShadow: 'var(--glow-accent), 4px 4px 0 #000',
            overflow: 'hidden',
            imageRendering: 'pixelated',
          }}>
            <Image
              src={getAvatarUrl(profile)}
              alt={profile.displayName}
              width={120} height={120}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }}
            />
          </div>

          <div style={{ ...vt323, fontSize: '26px', color: 'var(--text)' }}>{profile.displayName}</div>

          {!isCustom && (
            <button
              onClick={handleRandomize}
              disabled={randomizing}
              className="flex items-center gap-2 cursor-pointer transition-all active:translate-y-px disabled:opacity-50"
              style={{ ...pixelFont, fontSize: '7px', padding: '8px 14px', border: '2px solid var(--border)', boxShadow: '2px 2px 0 #000', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
            >
              <RefreshCw size={12} />
              {randomizing ? 'RANDOMIZING...' : 'RANDOMIZE AVATAR'}
            </button>
          )}
        </div>

        <button onClick={() => setStep(2)} style={btnPrimary} className="flex items-center justify-center gap-2 transition-all active:translate-y-px">
          NEXT <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  // ── Step 2: Challenge Start Date ──────────────────────────────────────────
  if (step === 2) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {progressDots}
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h2 style={{ ...pixelFont, fontSize: '12px', color: 'var(--accent)', lineHeight: 1.8 }}>YOUR CHALLENGE</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--text-muted)', marginTop: 8 }}>
            When did you start 75 Hard?
          </p>
        </div>

        <div style={cardStyle} className="p-6 space-y-4">
          <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>START DATE</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ ...inputStyle, fontSize: '18px', fontFamily: '"VT323", monospace' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This sets your Day 1 and controls your streak history.
          </p>
        </div>

        <button onClick={handleStep2Next} disabled={saving} style={btnPrimary} className="flex items-center justify-center gap-2 transition-all active:translate-y-px disabled:opacity-50">
          {saving ? 'SAVING...' : <><span>NEXT</span><ChevronRight size={14} /></>}
        </button>
        <button onClick={() => setStep(1)} style={btnSecondary} className="flex items-center justify-center gap-2 transition-all active:translate-y-px">
          <ChevronLeft size={12} /> BACK
        </button>
      </div>
    </div>
  );

  // ── Step 3: Fitness Profile ───────────────────────────────────────────────
  if (step === 3) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {progressDots}
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h2 style={{ ...pixelFont, fontSize: '11px', color: 'var(--accent)', lineHeight: 1.8 }}>FITNESS PROFILE</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginTop: 6 }}>
            All optional — used for insights & tracking
          </p>
        </div>

        <div style={cardStyle} className="p-5 space-y-5">

          {/* Weight */}
          <div className="space-y-2">
            <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>STARTING WEIGHT (optional)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={startingWeight}
                onChange={(e) => setStartingWeight(e.target.value)}
                placeholder={weightUnit === 'lbs' ? '165' : '75'}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <div className="flex" style={{ border: '2px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                {(['lbs', 'kg'] as const).map((u) => (
                  <button key={u} onClick={() => setWeightUnit(u)} style={{
                    ...pixelFont, fontSize: '7px', padding: '0 12px',
                    background: weightUnit === u ? 'var(--accent)' : 'var(--surface)',
                    color: weightUnit === u ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer', border: 'none',
                  }}>{u}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>
              HEIGHT (optional) — {weightUnit === 'lbs' ? 'inches' : 'cm'}
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={weightUnit === 'lbs' ? '70' : '178'}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Fitness Goal */}
          <div className="space-y-2">
            <label style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>YOUR GOAL (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button key={g.value} onClick={() => setFitnessGoal(fitnessGoal === g.value ? '' : g.value)}
                  style={{
                    ...pixelFont, fontSize: '6px', padding: '10px 6px',
                    border: '2px solid',
                    borderColor: fitnessGoal === g.value ? 'var(--accent)' : 'var(--border)',
                    boxShadow: fitnessGoal === g.value ? 'var(--glow-accent), 2px 2px 0 #000' : '2px 2px 0 #000',
                    background: fitnessGoal === g.value ? 'var(--accent-light)' : 'var(--bg)',
                    color: fitnessGoal === g.value ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer', lineHeight: 1.8, textAlign: 'center',
                  }}>
                  <div style={{ fontSize: '18px', marginBottom: 4 }}>{g.emoji}</div>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleStep3Next} disabled={saving} style={btnPrimary} className="flex items-center justify-center gap-2 transition-all active:translate-y-px disabled:opacity-50">
          {saving ? 'SAVING...' : <><span>NEXT</span><ChevronRight size={14} /></>}
        </button>
        <button onClick={() => setStep(4)} style={btnSecondary} className="flex items-center justify-center gap-2 transition-all active:translate-y-px">
          SKIP THIS STEP
        </button>
        <button onClick={() => setStep(2)} style={{ ...btnSecondary, background: 'none', border: 'none', boxShadow: 'none' }} className="flex items-center justify-center gap-2">
          <ChevronLeft size={12} /> BACK
        </button>
      </div>
    </div>
  );

  // ── Step 4: Ready ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {progressDots}
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p style={{ ...pixelFont, fontSize: '7px', color: 'var(--green)', letterSpacing: '0.2em' }}>ALL SET</p>
          <h2 style={{ ...pixelFont, fontSize: '16px', color: 'var(--accent)', textShadow: 'var(--glow-accent)', lineHeight: 1.6 }}>
            LET&apos;S GET IT
          </h2>
        </div>

        <div style={cardStyle} className="p-6 flex flex-col items-center gap-4">
          <div style={{
            width: 96, height: 96,
            border: '3px solid var(--green)',
            boxShadow: 'var(--glow-green), 4px 4px 0 #000',
            overflow: 'hidden',
            imageRendering: 'pixelated',
          }}>
            <Image
              src={getAvatarUrl(profile)}
              alt={profile.displayName}
              width={96} height={96}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/avatars/default.png'; }}
            />
          </div>

          <div style={{ ...vt323, fontSize: '24px', color: 'var(--text)' }}>{profile.displayName}</div>

          <div className="w-full space-y-2 pt-2" style={{ borderTop: '2px solid var(--border)' }}>
            {[
              { label: 'CHALLENGE START', value: profile.challengeStartDate },
              ...(fitnessGoal ? [{ label: 'GOAL', value: GOALS.find((g) => g.value === fitnessGoal)?.label ?? '' }] : []),
              ...(startingWeight ? [{ label: 'STARTING WEIGHT', value: `${startingWeight} ${weightUnit}` }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1">
                <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: '"VT323", monospace', fontSize: '18px', color: 'var(--text)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleFinish} disabled={saving} style={{ ...btnPrimary, background: 'var(--green)', borderColor: 'var(--green)' }}
          className="flex items-center justify-center gap-2 transition-all active:translate-y-px disabled:opacity-50">
          {saving ? 'STARTING...' : <><Check size={14} /><span>START MY CHALLENGE</span></>}
        </button>
        <button onClick={() => setStep(3)} style={btnSecondary} className="flex items-center justify-center gap-2 transition-all active:translate-y-px">
          <ChevronLeft size={12} /> BACK
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(() => getSessionCached<UserProfile>('75hard-profile'));

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (!p) return;
      if (p.onboardingComplete) { router.replace('/today'); return; }
      setProfile(p);
    });
  }, [user, router]);

  return (
    <AuthGuard>
      {profile ? <OnboardingInner profile={profile} /> : <LoadingScreen />}
    </AuthGuard>
  );
}
