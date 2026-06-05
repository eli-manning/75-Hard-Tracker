import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { UserProfile } from '../lib/types';
import { getAvatarUrl } from '../lib/avatar';
import { getAvatarSource, AVATAR_PORTRAIT_RATIO } from '../lib/avatarMap';
import { colors, fonts, shadows } from '../lib/theme';
import { StreakFlame } from './StreakFlame';

interface UserTabBarProps {
  users: UserProfile[];
  activeUid: string;
  onSelectUser: (uid: string) => void;
  currentUserUid: string;
}

export function UserTabBar({ users, activeUid, onSelectUser, currentUserUid }: UserTabBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {users.map((u) => {
        const isActive = u.uid === activeUid;
        return (
          <TouchableOpacity
            key={u.uid}
            onPress={() => onSelectUser(u.uid)}
            style={[styles.tab, { opacity: isActive ? 1 : 0.45 }]}
          >
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarFrame, isActive ? styles.avatarActive : styles.avatarInactive]}>
                {(() => {
                  const url = getAvatarUrl(u);
                  const ratio = AVATAR_PORTRAIT_RATIO[url];
                  return (
                    <Image
                      source={getAvatarSource(url)}
                      style={{ width: 64, height: ratio ? 64 / ratio : 64 }}
                      resizeMode={ratio ? 'stretch' : 'cover'}
                    />
                  );
                })()}
              </View>
              <StreakFlame streak={u.currentStreak ?? 0} size="sm" />
            </View>
            <View style={styles.nameRow}>
              {u.uid === currentUserUid && (
                <Text style={styles.arrow}>▶</Text>
              )}
              <Text style={[styles.name, isActive && styles.nameActive]}>
                {u.displayName.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    gap: 6,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarFrame: {
    width: 64,
    height: 64,
    borderWidth: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.pixel,
  },
  avatarActive: {
    borderColor: colors.accent,
    ...shadows.glowAccent,
  },
  avatarInactive: {
    borderColor: colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
  },
  name: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  nameActive: {
    color: colors.accent,
  },
});
