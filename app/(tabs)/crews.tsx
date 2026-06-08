import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import { useUserCrews } from '../../hooks/useUserCrews';
import { getCrewIconIon } from '../../lib/crews';
import { colors, fonts, shadows } from '../../lib/theme';
import { Crew } from '../../lib/types';

function CrewCard({ crew, onPress }: { crew: Crew; onPress: () => void }) {
  const iconName = getCrewIconIon(crew.icon) as any;
  return (
    <TouchableOpacity style={styles.crewCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.crewCardIcon}>
        <Ionicons name={iconName} size={22} color={colors.accent} />
      </View>
      <View style={styles.crewCardBody}>
        <Text style={styles.crewCardName} numberOfLines={1}>{crew.name}</Text>
        <Text style={styles.crewCardMeta}>
          {crew.members.length} {crew.members.length === 1 ? 'MEMBER' : 'MEMBERS'}
          {' · '}
          {crew.crewStreak > 0 ? `DAY ${crew.crewStreak} STREAK` : 'NO STREAK YET'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function JoinModal({ onClose, onJoined }: { onClose: () => void; onJoined: (crewId: string) => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) { setErr('Code must be exactly 6 characters'); return; }
    setLoading(true);
    setErr('');
    try {
      const fn = httpsCallable<{ joinCode: string }, { crewId: string; crewName: string }>(
        getFunctions(undefined, 'us-west2'), 'joinCrew'
      );
      const result = await fn({ joinCode: trimmed });
      onJoined(result.data.crewId);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to join crew');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>JOIN A CREW</Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().slice(0, 6))}
          placeholder="ENTER CODE"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          style={styles.codeInput}
        />
        {err ? <Text style={styles.errorText}>{err}</Text> : null}
        <View style={styles.modalBtns}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={loading}>
            <Text style={styles.cancelBtnText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleJoin}
            style={[styles.joinBtn, (loading || code.trim().length !== 6) && styles.btnDisabled]}
            disabled={loading || code.trim().length !== 6}
          >
            {loading
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={styles.joinBtnText}>JOIN</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CrewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { crews, loading, error, refresh } = useUserCrews(user?.uid ?? null);
  const [showJoin, setShowJoin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function handleJoined(crewId: string) {
    setShowJoin(false);
    router.push(`/crews/${crewId}` as any);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {showJoin && (
        <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
      )}

      <View style={styles.header}>
        <Text style={styles.pageTitle}>CREWS</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {crews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>NO CREWS YET</Text>
              <Text style={styles.emptyBody}>Join a crew with a code or create your own</Text>
            </View>
          ) : (
            <View style={styles.crewList}>
              {crews.map((crew) => (
                <CrewCard
                  key={crew.id}
                  crew={crew}
                  onPress={() => router.push(`/crews/${crew.id}` as any)}
                />
              ))}
            </View>
          )}

          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowJoin(true)}>
              <Ionicons name="enter-outline" size={14} color={colors.accent} />
              <Text style={styles.secondaryBtnText}>JOIN A CREW</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/crews/create' as any)}>
              <Ionicons name="add" size={14} color={colors.white} />
              <Text style={styles.primaryBtnText}>CREATE A CREW</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  pageTitle: { fontFamily: fonts.pixel, fontSize: 14, color: colors.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  emptyTitle: { fontFamily: fonts.pixel, fontSize: 10, color: colors.textMuted },
  emptyBody: { fontFamily: fonts.inter, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  crewList: { gap: 8 },
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  crewCardIcon: {
    width: 40, height: 40,
    borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  crewCardBody: { flex: 1, minWidth: 0, gap: 3 },
  crewCardName: { fontFamily: fonts.pixel, fontSize: 8, color: colors.text },
  crewCardMeta: { fontFamily: fonts.inter, fontSize: 11, color: colors.textMuted },
  actionBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent,
    ...shadows.pixel,
  },
  primaryBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.white },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentLight,
  },
  secondaryBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.accent },
  errorText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.red, textAlign: 'center' },
  // Join modal
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
    padding: 32, zIndex: 100,
  },
  modalCard: {
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent,
    padding: 24, gap: 16, width: '100%', maxWidth: 416,
  },
  modalTitle: { fontFamily: fonts.pixel, fontSize: 9, color: colors.accent },
  codeInput: {
    fontFamily: fonts.pixel, fontSize: 14, color: colors.text,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2, padding: 12,
    letterSpacing: 4,
  },
  modalBtns: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  joinBtn: {
    flex: 1, paddingVertical: 12, borderWidth: 2, borderColor: colors.accent,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  joinBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.white },
  btnDisabled: { opacity: 0.4 },
});
