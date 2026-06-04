import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, Animated, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../lib/auth';
import {
  getUserProfile, getAllUsers, getPendingRequests,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend,
} from '../lib/firestore';
import { UserProfile } from '../lib/types';
import { getAvatarUrl } from '../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../lib/avatarMap';
import { getCached, invalidate } from '../lib/cache';
import { colors, fonts, shadows } from '../lib/theme';
import { InstallPrompt } from './InstallPrompt';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
  onRequestsSeen?: () => void;
}

const DRAWER_WIDTH = 280;
const SCREEN_WIDTH = Dimensions.get('window').width;

function AvatarImg({ url, size }: { url: string; size: number }) {
  const source = getAvatarSource(url);
  const ratio = AVATAR_PORTRAIT_RATIO[url];
  // Portrait sprites: render taller than the container so the head (top) fills the frame
  return (
    <Image
      source={source}
      style={{ width: size, height: ratio ? size / ratio : size }}
      resizeMode={ratio ? 'stretch' : 'cover'}
    />
  );
}

export function SideMenu({ open, onClose, profile, onProfileUpdate, onRequestsSeen }: SideMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const drawerAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => getCached<UserProfile[]>('all-users') ?? []);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [friendsActionUid, setFriendsActionUid] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState('');

  const onProfileUpdateRef = useRef(onProfileUpdate);
  onProfileUpdateRef.current = onProfileUpdate;
  const onRequestsSeenRef = useRef(onRequestsSeen);
  onRequestsSeenRef.current = onRequestsSeen;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: open ? 0 : DRAWER_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: open ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  useEffect(() => {
    if (!open) { setSentRequests(new Set()); setFriendSearch(''); return; }

    invalidate(`profile-${profile.uid}`);
    getUserProfile(profile.uid).then((fresh) => {
      if (fresh) onProfileUpdateRef.current(fresh);
    }).catch(() => {});

    invalidate('all-users');
    getAllUsers().then(setAllUsers).catch(() => {});

    setRequestsLoading(true);
    getPendingRequests(profile.uid)
      .then((reqs) => { setPendingRequests(reqs); if (reqs.length === 0) onRequestsSeenRef.current?.(); })
      .catch(() => setPendingRequests([]))
      .finally(() => setRequestsLoading(false));
  }, [open, profile.uid]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  async function handleSendRequest(toUid: string) {
    setFriendsActionUid(toUid);
    const autoAccepted = await sendFriendRequest(profile.uid, toUid);
    if (autoAccepted) {
      onProfileUpdate({ ...profile, friends: [...(profile.friends ?? []), toUid] });
    } else {
      setSentRequests((prev) => new Set(Array.from(prev).concat(toUid)));
    }
    setFriendsActionUid(null);
  }

  async function handleAccept(fromUid: string) {
    setFriendsActionUid(fromUid);
    await acceptFriendRequest(profile.uid, fromUid);
    onProfileUpdate({ ...profile, friends: [...(profile.friends ?? []), fromUid] });
    setPendingRequests((prev) => prev.filter((uid) => uid !== fromUid));
    setFriendsActionUid(null);
  }

  async function handleDecline(fromUid: string) {
    setFriendsActionUid(fromUid);
    await declineFriendRequest(profile.uid, fromUid);
    setPendingRequests((prev) => prev.filter((uid) => uid !== fromUid));
    setFriendsActionUid(null);
  }

  async function handleRemoveFriend(friendUid: string) {
    setFriendsActionUid(friendUid);
    await removeFriend(profile.uid, friendUid);
    onProfileUpdate({ ...profile, friends: (profile.friends ?? []).filter((uid) => uid !== friendUid) });
    setFriendsActionUid(null);
  }

  const friendUids = new Set(profile.friends ?? []);
  const friends = allUsers.filter((u) => friendUids.has(u.uid));
  const requesters = allUsers.filter((u) => pendingRequests.includes(u.uid));
  const addCandidates = allUsers.filter(
    (u) => u.uid !== profile.uid && !friendUids.has(u.uid) && !pendingRequests.includes(u.uid)
  );

  const q = friendSearch.trim().toLowerCase();
  const searchResults = q
    ? addCandidates.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    : [];

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        {/* Header */}
        <View style={[styles.drawerHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.drawerTitle}>MENU</Text>
          <TouchableOpacity onPress={onClose} style={{ opacity: 0.6 }}>
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea}>
          {/* Profile link */}
          <TouchableOpacity
            onPress={() => { router.push('/profile' as any); onClose(); }}
            style={styles.profileBtn}
          >
            <View style={styles.avatarFrameAccent}>
              <AvatarImg url={getAvatarUrl(profile)} size={48} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.profileName} numberOfLines={1}>{profile.displayName}</Text>
              <Text style={styles.profileCta}>VIEW PROFILE</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>

          {/* Friends section */}
          <View style={styles.friendsSection}>
            <View style={styles.friendsHeader}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={styles.friendsTitle}>FRIENDS</Text>
              {!requestsLoading && requesters.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{requesters.length}</Text>
                </View>
              )}
            </View>

            {/* Incoming requests */}
            {requestsLoading ? (
              <Text style={styles.bodyText}>Checking requests…</Text>
            ) : requesters.length > 0 && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionLabel}>REQUESTS</Text>
                {requesters.map((u) => (
                  <View key={u.uid} style={styles.userRow}>
                    <View style={styles.avatarFrameSmall}>
                      <AvatarImg url={getAvatarUrl(u)} size={36} />
                    </View>
                    <Text style={styles.userName} numberOfLines={1}>{u.displayName}</Text>
                    <TouchableOpacity
                      onPress={() => { handleAccept(u.uid); onRequestsSeen?.(); }}
                      disabled={friendsActionUid === u.uid}
                      style={[styles.actionBtnGreen, friendsActionUid === u.uid && { opacity: 0.5 }]}
                    >
                      <Text style={styles.actionBtnGreenText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDecline(u.uid)}
                      disabled={friendsActionUid === u.uid}
                      style={[styles.actionBtnRed, friendsActionUid === u.uid && { opacity: 0.5 }]}
                    >
                      <Text style={styles.actionBtnRedText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Current friends */}
            {friends.length > 0 && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionLabel}>YOUR FRIENDS</Text>
                {friends.map((u) => (
                  <View key={u.uid} style={styles.userRow}>
                    <View style={styles.avatarFrameTiny}>
                      <AvatarImg url={getAvatarUrl(u)} size={28} />
                    </View>
                    <Text style={[styles.bodyText, { flex: 1 }]} numberOfLines={1}>{u.displayName}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveFriend(u.uid)}
                      disabled={friendsActionUid === u.uid}
                      style={{ opacity: friendsActionUid === u.uid ? 0.3 : 0.4 }}
                    >
                      <Ionicons name="person-remove-outline" size={14} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add friends */}
            <View style={styles.subSection}>
              <Text style={styles.subSectionLabel}>ADD FRIENDS</Text>
              <TextInput
                value={friendSearch}
                onChangeText={setFriendSearch}
                placeholder="Search by name or email…"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
              {searchResults.length === 0 && q.length > 0 && (
                <Text style={styles.bodyText}>No users found.</Text>
              )}
              {searchResults.map((u) => {
                const sent = sentRequests.has(u.uid);
                return (
                  <View key={u.uid} style={styles.userRow}>
                    <View style={styles.avatarFrameTiny}>
                      <AvatarImg url={getAvatarUrl(u)} size={28} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.bodyText} numberOfLines={1}>{u.displayName}</Text>
                    </View>
                    {sent ? (
                      <Text style={styles.sentLabel}>SENT</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleSendRequest(u.uid)}
                        disabled={friendsActionUid === u.uid}
                        style={{ opacity: friendsActionUid === u.uid ? 0.5 : 1 }}
                      >
                        <Ionicons name="person-add-outline" size={14} color={colors.accent} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Install prompt */}
          <View style={styles.installSection}>
            <InstallPrompt />
          </View>

          {/* Sign out + legal */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={14} color={colors.textMuted} />
              <Text style={styles.signOutText}>SIGN OUT</Text>
            </TouchableOpacity>
            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => { router.push('/privacy' as any); onClose(); }}>
                <Text style={styles.legalLink}>PRIVACY</Text>
              </TouchableOpacity>
              <Text style={styles.legalSep}>|</Text>
              <TouchableOpacity onPress={() => { router.push('/terms' as any); onClose(); }}>
                <Text style={styles.legalLink}>TERMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 40,
  },
  drawer: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  drawerTitle: { fontFamily: fonts.pixel, fontSize: 8, color: colors.accent },
  scrollArea: { flex: 1 },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  avatarFrameAccent: {
    width: 48, height: 48,
    borderWidth: 2, borderColor: colors.accent,
    overflow: 'hidden', flexShrink: 0,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
  },
  profileAvatar: { width: 48, height: 48 },
  profileName: { fontFamily: fonts.vt323, fontSize: 22, color: colors.text },
  profileCta: { fontFamily: fonts.pixel, fontSize: 6, color: colors.accent, marginTop: 2 },
  friendsSection: {
    padding: 16, gap: 12,
    borderBottomWidth: 2, borderBottomColor: colors.border,
  },
  friendsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friendsTitle: { fontFamily: fonts.pixel, fontSize: 7, color: colors.textMuted },
  badge: {
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.red, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.inter, fontSize: 10, fontWeight: '700', color: colors.white },
  subSection: { gap: 8 },
  subSectionLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarFrameSmall: { width: 36, height: 36, borderWidth: 2, borderColor: colors.accent, overflow: 'hidden', flexShrink: 0 },
  avatarFrameTiny: { width: 28, height: 28, borderWidth: 2, borderColor: colors.border, overflow: 'hidden', flexShrink: 0 },
  userName: { fontFamily: fonts.interSemiBold, fontSize: 13, color: colors.text, flex: 1 },
  bodyText: { fontFamily: fonts.inter, fontSize: 12, color: colors.text },
  actionBtnGreen: { paddingHorizontal: 9, paddingVertical: 3, borderWidth: 2, borderColor: colors.green, backgroundColor: colors.greenLight },
  actionBtnGreenText: { fontFamily: fonts.inter, fontSize: 15, fontWeight: '700', color: colors.green },
  actionBtnRed: { paddingHorizontal: 9, paddingVertical: 3, borderWidth: 2, borderColor: colors.red, backgroundColor: colors.redLight },
  actionBtnRedText: { fontFamily: fonts.inter, fontSize: 15, fontWeight: '700', color: colors.red },
  searchInput: {
    fontFamily: fonts.inter, fontSize: 12, padding: 8,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2, color: colors.text,
  },
  sentLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  footer: { padding: 16, gap: 12, marginTop: 'auto' },
  installSection: { paddingHorizontal: 16, paddingVertical: 8 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface2,
    ...shadows.pixel,
  },
  signOutText: { fontFamily: fonts.pixel, fontSize: 8, color: colors.textMuted },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, alignItems: 'center' },
  legalLink: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  legalSep: { color: colors.border },
});
