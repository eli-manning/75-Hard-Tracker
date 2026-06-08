import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeToCrewById, updateCrewName, updateCrewIcon,
  updateCrewActiveTasks, addCrewCustomTask, removeCrewCustomTask,
  promoteToAdmin, demoteFromAdmin,
  getUserProfile, invalidateUserCrews, getDayEntry,
} from '../../lib/firestore';
import { CREW_ICONS, getCrewIconIon } from '../../lib/crews';
import { StreakBadge } from '../../components/StreakBadge';
import { getAvatarUrl } from '../../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../../lib/avatarMap';
import { colors, fonts, shadows } from '../../lib/theme';
import { Crew, CrewTask, UserProfile, DayEntry } from '../../lib/types';
import { format } from 'date-fns';

const CORE_KEYS: { key: keyof Crew['activeTasks']; label: string; icon: string }[] = [
  { key: 'workout1', label: 'Workout 1',        icon: 'barbell-outline' },
  { key: 'workout2', label: 'Workout 2 Outdoor', icon: 'walk-outline' },
  { key: 'diet',     label: 'Diet',              icon: 'nutrition-outline' },
  { key: 'water',    label: 'Water',             icon: 'water-outline' },
  { key: 'reading',  label: 'Reading',           icon: 'book-outline' },
  { key: 'photo',    label: 'Progress Photo',    icon: 'camera-outline' },
];

const TASK_ENTRY_FIELD: Record<string, keyof DayEntry> = {
  workout1: 'workoutOneCompleted',
  workout2: 'workoutTwoCompleted',
  diet: 'dietCompleted',
  water: 'waterCompleted',
  reading: 'readingCompleted',
  photo: 'photoCompleted',
};

function MemberAvatar({ profile, size = 52 }: { profile?: UserProfile; size?: number }) {
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

function IconPickerModal({ current, onSelect, onClose }: {
  current: string; onSelect: (key: string) => void; onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>CHOOSE ICON</Text>
          <View style={styles.iconGrid}>
            {CREW_ICONS.map((ci) => (
              <TouchableOpacity
                key={ci.key}
                style={[styles.iconPickerCard, current === ci.key && styles.iconPickerCardSelected]}
                onPress={() => onSelect(ci.key)}
              >
                <Ionicons name={ci.ion as any} size={22} color={current === ci.key ? colors.white : colors.accent} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CrewDetailPage() {
  const { crewId } = useLocalSearchParams<{ crewId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [memberDayEntries, setMemberDayEntries] = useState<Record<string, DayEntry>>({});
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [customTaskAmount, setCustomTaskAmount] = useState('');
  const [customTaskUnit, setCustomTaskUnit] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const isAdmin = crew ? crew.admins.includes(user?.uid ?? '') : false;
  const isCreator = crew ? crew.creatorUid === user?.uid : false;

  useEffect(() => {
    if (!crewId) return;
    return subscribeToCrewById(crewId, (c) => { setCrew(c); setLoading(false); });
  }, [crewId]);

  useEffect(() => {
    if (!crew) return;
    const missing = crew.members.filter((uid) => !memberProfiles[uid]);
    if (!missing.length) return;
    Promise.all(missing.map((uid) => getUserProfile(uid))).then((profiles) => {
      setMemberProfiles((prev) => {
        const next = { ...prev };
        profiles.forEach((p) => { if (p) next[p.uid] = p; });
        return next;
      });
    }).catch(() => {});
  }, [crew?.members.join(',')]);

  const fetchMemberDayEntries = useCallback(async (members: string[]) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const results = await Promise.all(
      members.map((uid) => getDayEntry(uid, today).catch(() => null))
    );
    setMemberDayEntries((prev) => {
      const next = { ...prev };
      members.forEach((uid, i) => { if (results[i]) next[uid] = results[i]!; });
      return next;
    });
  }, []);

  useEffect(() => {
    if (crew?.members.length) fetchMemberDayEntries(crew.members);
  }, [crew?.members.join(',')]);

  useFocusEffect(useCallback(() => {
    if (user?.uid) invalidateUserCrews(user.uid);
    if (crew?.members.length) fetchMemberDayEntries(crew.members);
  }, [user?.uid, crew?.members.join(',')]));

  async function callFn(name: string, data: object) {
    return httpsCallable(getFunctions(undefined, 'us-west2'), name)(data);
  }

  async function handleKick(targetUid: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'They will be removed from the crew.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try { await callFn('kickMember', { crewId: crew!.id, targetUid }); }
        catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
        finally { setActionLoading(false); }
      }},
    ]);
  }

  async function handlePromote(targetUid: string) {
    setActionLoading(true);
    try { await promoteToAdmin(crew!.id, targetUid); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
    finally { setActionLoading(false); }
  }

  async function handleDemote(targetUid: string) {
    setActionLoading(true);
    try { await demoteFromAdmin(crew!.id, targetUid); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
    finally { setActionLoading(false); }
  }

  async function handleLeave() {
    Alert.alert('Leave Crew', `Leave ${crew?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try { await callFn('leaveCrew', { crewId: crew!.id }); router.replace('/(tabs)/crews' as any); }
        catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); setActionLoading(false); }
      }},
    ]);
  }

  async function handleDelete() {
    Alert.alert('Delete Crew', `Permanently delete ${crew?.name} for all members?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Forever', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try { await callFn('deleteCrew', { crewId: crew!.id }); router.replace('/(tabs)/crews' as any); }
        catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); setActionLoading(false); }
      }},
    ]);
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim().slice(0, 30);
    if (trimmed && trimmed !== crew?.name) await updateCrewName(crew!.id, trimmed);
    setEditingName(false);
  }

  async function handleToggleTask(key: keyof Crew['activeTasks']) {
    if (!crew || !isAdmin) return;
    await updateCrewActiveTasks(crew.id, { ...crew.activeTasks, [key]: !crew.activeTasks[key] });
  }

  async function handleAddCustomTask() {
    if (!crew || !customTaskInput.trim()) return;
    const parsedAmount = parseFloat(customTaskAmount);
    await addCrewCustomTask(crew.id, {
      id: Math.random().toString(36).slice(2),
      label: customTaskInput.trim().slice(0, 60),
      order: crew.customCrewTasks.length,
      ...(!isNaN(parsedAmount) && parsedAmount > 0 ? { amount: parsedAmount } : {}),
      ...(customTaskUnit.trim() ? { unit: customTaskUnit.trim().slice(0, 20) } : {}),
    });
    setCustomTaskInput('');
    setCustomTaskAmount('');
    setCustomTaskUnit('');
  }

  async function copyJoinCode() {
    if (!crew) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(crew.joinCode);
    }
    Alert.alert('Join Code', crew.joinCode, [{ text: 'OK' }]);
  }

  if (loading || !crew) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const iconName = getCrewIconIon(crew.icon) as any;
  const activeCoreKeys = CORE_KEYS.filter(({ key }) => crew.activeTasks[key]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {showIconPicker && (
        <IconPickerModal
          current={crew.icon}
          onSelect={async (key) => { await updateCrewIcon(crew.id, key); setShowIconPicker(false); }}
          onClose={() => setShowIconPicker(false)}
        />
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity onPress={() => setEditMode((e) => !e)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>{editMode ? 'DONE' : 'EDIT'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity
            onPress={() => { if (isAdmin && editMode) setShowIconPicker(true); }}
            activeOpacity={isAdmin && editMode ? 0.7 : 1}
            style={styles.heroIconFrame}
          >
            <Ionicons name={iconName} size={44} color={colors.accent} />
            {isAdmin && editMode && (
              <View style={styles.iconEditBadge}>
                <Ionicons name="swap-horizontal-outline" size={10} color={colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>

          {editMode && editingName ? (
            <TextInput
              ref={nameInputRef}
              value={nameInput}
              onChangeText={(v) => setNameInput(v.slice(0, 30))}
              style={styles.nameEditInput}
              autoFocus
              onSubmitEditing={handleSaveName}
              onBlur={handleSaveName}
              maxLength={30}
              textAlign="center"
            />
          ) : (
            <TouchableOpacity
              onPress={() => { if (isAdmin && editMode) { setNameInput(crew.name); setEditingName(true); } }}
              activeOpacity={isAdmin && editMode ? 0.7 : 1}
              style={styles.heroNameRow}
            >
              <Text style={styles.heroName}>{crew.name}</Text>
              {isAdmin && editMode && (
                <Ionicons name="pencil-outline" size={14} color={colors.textMuted} style={{ marginLeft: 6, opacity: 0.5 }} />
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.heroMeta}>
            {crew.members.length} {crew.members.length === 1 ? 'MEMBER' : 'MEMBERS'}
          </Text>

          {crew.crewStreak > 0 ? (
            <StreakBadge streak={crew.crewStreak} />
          ) : (
            <Text style={styles.noStreakText}>NO STREAK YET</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{crew.crewStreak}</Text>
            <Text style={styles.statLbl}>CURRENT{'\n'}STREAK</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 0 }]}>
            <Text style={styles.statVal}>{crew.longestCrewStreak}</Text>
            <Text style={styles.statLbl}>LONGEST{'\n'}STREAK</Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>MEMBERS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberScroll}>
            {crew.members.map((uid) => {
              const profile = memberProfiles[uid];
              const memberIsAdmin = crew.admins.includes(uid);
              const memberIsCreator = crew.creatorUid === uid;
              const isSelf = uid === user?.uid;
              const canKick = editMode && isAdmin && !isSelf && !memberIsCreator;
              const canPromote = editMode && isCreator && !memberIsAdmin;
              const canDemote = editMode && isCreator && memberIsAdmin && !memberIsCreator;

              return (
                <View key={uid} style={styles.memberCard}>
                  <View style={styles.memberAvatarWrap}>
                    <MemberAvatar profile={profile} size={52} />
                    {memberIsCreator && (
                      <View style={[styles.memberRoleDot, { backgroundColor: colors.yellow }]}>
                        <Ionicons name="ribbon-outline" size={8} color={colors.bg} />
                      </View>
                    )}
                    {memberIsAdmin && !memberIsCreator && (
                      <View style={[styles.memberRoleDot, { backgroundColor: colors.accent }]}>
                        <Ionicons name="star-outline" size={8} color={colors.white} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberCardName} numberOfLines={1}>
                    {profile?.displayName ?? '...'}
                    {isSelf ? '\n(you)' : ''}
                  </Text>
                  {(canKick || canPromote || canDemote) && (
                    <View style={styles.memberCardActions}>
                      {canPromote && (
                        <TouchableOpacity
                          onPress={() => handlePromote(uid)}
                          disabled={actionLoading}
                          style={styles.memberActionBtn}
                        >
                          <Ionicons name="star-outline" size={11} color={colors.accent} />
                        </TouchableOpacity>
                      )}
                      {canDemote && (
                        <TouchableOpacity
                          onPress={() => handleDemote(uid)}
                          disabled={actionLoading}
                          style={styles.memberActionBtn}
                        >
                          <Ionicons name="star" size={11} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      {canKick && (
                        <TouchableOpacity
                          onPress={() => handleKick(uid, profile?.displayName ?? uid.slice(0, 8))}
                          disabled={actionLoading}
                          style={[styles.memberActionBtn, { borderColor: colors.red }]}
                        >
                          <Ionicons name="close" size={11} color={colors.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Tasks — view mode: completion avatars */}
        {!editMode && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>TODAY'S TASKS</Text>
            <View style={styles.viewTaskList}>
              {activeCoreKeys.map(({ key, label, icon }) => {
                const field = TASK_ENTRY_FIELD[key];
                const doneBy = crew.members.filter((uid) => memberDayEntries[uid]?.[field] === true);
                return (
                  <View key={key} style={styles.viewTaskRow}>
                    <View style={styles.viewTaskHeader}>
                      <Ionicons name={icon as any} size={15} color={colors.accent} />
                      <Text style={styles.viewTaskLabel}>{label}</Text>
                      <Text style={styles.viewTaskCount}>{doneBy.length}/{crew.members.length}</Text>
                    </View>
                    {doneBy.length > 0 && (
                      <View style={styles.completorRow}>
                        {doneBy.map((uid) => (
                          <MemberAvatar key={uid} profile={memberProfiles[uid]} size={28} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {crew.customCrewTasks.map((task) => {
                const doneBy = crew.members.filter((uid) =>
                  memberDayEntries[uid]?.crewTasksCompleted?.includes(task.id)
                );
                return (
                  <View key={task.id} style={styles.viewTaskRow}>
                    <View style={styles.viewTaskHeader}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={colors.accent} />
                      <Text style={styles.viewTaskLabel} numberOfLines={1}>{task.label}</Text>
                      {task.amount != null && (
                        <View style={styles.amountChip}>
                          <Text style={styles.amountChipText}>
                            {task.amount}{task.unit ? ` ${task.unit}` : ''}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.viewTaskCount}>{doneBy.length}/{crew.members.length}</Text>
                    </View>
                    {doneBy.length > 0 && (
                      <View style={styles.completorRow}>
                        {doneBy.map((uid) => (
                          <MemberAvatar key={uid} profile={memberProfiles[uid]} size={28} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {activeCoreKeys.length === 0 && crew.customCrewTasks.length === 0 && (
                <Text style={styles.emptyTasks}>No active tasks</Text>
              )}
            </View>
          </View>
        )}

        {/* Tasks — edit mode: toggles + add */}
        {editMode && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>DAILY TASKS</Text>
            <View style={styles.taskList}>
              {CORE_KEYS.map(({ key, label, icon }) => {
                const active = crew.activeTasks[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.taskRow, !active && styles.taskRowOff]}
                    onPress={() => handleToggleTask(key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={icon as any} size={16} color={active ? colors.accent : colors.border} />
                    <Text style={[styles.taskLabel, !active && styles.taskLabelOff]}>{label}</Text>
                    <View style={[styles.togglePill, active && styles.togglePillOn]}>
                      <Text style={[styles.togglePillText, active && styles.togglePillTextOn]}>
                        {active ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {crew.customCrewTasks.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
                  <Text style={styles.taskLabel} numberOfLines={1}>{task.label}</Text>
                  {task.amount != null && (
                    <View style={styles.amountChip}>
                      <Text style={styles.amountChipText}>
                        {task.amount}{task.unit ? ` ${task.unit}` : ''}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => removeCrewCustomTask(crew.id, task.id)} style={styles.removeTaskBtn}>
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addTaskRow}>
                <TextInput
                  value={customTaskInput}
                  onChangeText={(v) => setCustomTaskInput(v.slice(0, 60))}
                  placeholder="Add a shared task…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.addTaskInput}
                  returnKeyType={customTaskInput.trim() ? 'next' : 'done'}
                  onSubmitEditing={!customTaskInput.trim() ? undefined : handleAddCustomTask}
                />
                <TouchableOpacity
                  onPress={handleAddCustomTask}
                  disabled={!customTaskInput.trim()}
                  style={[styles.addTaskBtn, !customTaskInput.trim() && { opacity: 0.35 }]}
                >
                  <Ionicons name="add" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
              {customTaskInput.trim().length > 0 && (
                <View style={styles.addAmountRow}>
                  <TextInput
                    value={customTaskAmount}
                    onChangeText={(v) => setCustomTaskAmount(v.replace(/[^0-9.]/g, ''))}
                    placeholder="Amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    style={[styles.addTaskInput, styles.amountInput]}
                  />
                  <TextInput
                    value={customTaskUnit}
                    onChangeText={(v) => setCustomTaskUnit(v.slice(0, 20))}
                    placeholder="Unit (e.g. miles)"
                    placeholderTextColor={colors.textMuted}
                    maxLength={20}
                    style={[styles.addTaskInput, { flex: 1 }]}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Danger zone */}
        <View style={styles.dangerBlock}>
          <TouchableOpacity style={styles.settingsRow} onPress={copyJoinCode}>
            <View style={styles.settingsRowLeft}>
              <Ionicons name="key-outline" size={16} color={colors.textMuted} />
              <View>
                <Text style={styles.settingsRowLabel}>JOIN CODE</Text>
                <Text style={styles.joinCode}>{crew.joinCode}</Text>
              </View>
            </View>
            <View style={styles.copyHint}>
              <Ionicons name="copy-outline" size={13} color={colors.textMuted} />
              <Text style={styles.copyHintText}>COPY</Text>
            </View>
          </TouchableOpacity>
          {!isCreator && (
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} disabled={actionLoading}>
              <Ionicons name="exit-outline" size={14} color={colors.red} />
              <Text style={styles.leaveBtnText}>LEAVE CREW</Text>
            </TouchableOpacity>
          )}
          {isCreator && editMode && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={actionLoading}>
              <Ionicons name="trash-outline" size={14} color={colors.white} />
              <Text style={styles.deleteBtnText}>DELETE CREW</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  editBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  editBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.accent },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, gap: 10 },
  heroIconFrame: {
    width: 88, height: 88,
    borderWidth: 3, borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.glowAccent,
  },
  iconEditBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.surface2,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroNameRow: { flexDirection: 'row', alignItems: 'center' },
  heroName: { fontFamily: fonts.vt323, fontSize: 36, color: colors.text, textAlign: 'center' },
  nameEditInput: {
    fontFamily: fonts.vt323, fontSize: 32, color: colors.accent,
    borderWidth: 2, borderColor: colors.accent,
    backgroundColor: colors.surface2,
    paddingHorizontal: 16, paddingVertical: 6,
    minWidth: 200,
  },
  heroMeta: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, letterSpacing: 1 },
  noStreakText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted, opacity: 0.6 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.border,
    marginHorizontal: 0,
  },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4,
    borderLeftWidth: 2, borderColor: colors.border,
  },
  statVal: { fontFamily: fonts.pixel, fontSize: 22, color: colors.accent },
  statLbl: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, textAlign: 'center', lineHeight: 9 },

  // Section
  sectionBlock: { paddingHorizontal: 16, paddingTop: 24, gap: 12 },
  sectionLabel: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted },

  // Members
  memberScroll: { gap: 10, paddingVertical: 4, paddingRight: 16 },
  memberCard: { alignItems: 'center', gap: 6, width: 72 },
  memberAvatarWrap: { position: 'relative' },
  avatarFrame: { overflow: 'hidden', borderWidth: 2, borderColor: colors.border },
  avatarPlaceholder: {
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  memberRoleDot: {
    position: 'absolute', bottom: -3, right: -3,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  memberCardName: {
    fontFamily: fonts.inter, fontSize: 11, color: colors.text,
    textAlign: 'center', lineHeight: 14,
  },
  memberCardActions: { flexDirection: 'row', gap: 4 },
  memberActionBtn: {
    width: 22, height: 22, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface2,
  },

  // View mode tasks
  viewTaskList: {
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  viewTaskRow: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 8,
  },
  viewTaskHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewTaskLabel: { flex: 1, fontFamily: fonts.vt323, fontSize: 19, color: colors.text },
  viewTaskCount: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  completorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingLeft: 2 },
  emptyTasks: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted, padding: 14 },

  // Edit mode tasks
  taskList: {
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.pixel,
  },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  taskRowOff: { opacity: 0.45 },
  taskLabel: { flex: 1, fontFamily: fonts.vt323, fontSize: 19, color: colors.text },
  taskLabelOff: { color: colors.textMuted },
  togglePill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  togglePillOn: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  togglePillText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },
  togglePillTextOn: { color: colors.accent },
  removeTaskBtn: { padding: 4 },
  addTaskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  addAmountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 8,
  },
  addTaskInput: {
    flex: 1, fontFamily: fonts.inter, fontSize: 13, color: colors.text,
  },
  amountInput: { flex: 0, width: 80 },
  addTaskBtn: {
    width: 28, height: 28, borderWidth: 1.5, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  amountChip: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2, flexShrink: 0,
  },
  amountChipText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.text },

  // Settings
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, ...shadows.pixel,
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowLabel: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted, marginBottom: 4 },
  joinCode: { fontFamily: fonts.pixel, fontSize: 16, color: colors.accent, letterSpacing: 3 },
  copyHint: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.5 },
  copyHintText: { fontFamily: fonts.pixel, fontSize: 5, color: colors.textMuted },

  // Danger
  dangerBlock: { paddingHorizontal: 16, paddingTop: 32, gap: 10 },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderWidth: 2, borderColor: colors.red,
  },
  leaveBtnText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.red },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderWidth: 2, borderColor: colors.red, backgroundColor: colors.red,
  },
  deleteBtnText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.white },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent,
    padding: 20, gap: 16, width: '100%',
  },
  modalTitle: { fontFamily: fonts.pixel, fontSize: 9, color: colors.accent },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconPickerCard: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  iconPickerCardSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  cancelBtn: { paddingVertical: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
});
