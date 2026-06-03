import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadows } from '../lib/theme';

const NAV = [
  { href: '/(tabs)/today', label: 'TODAY', icon: 'sunny-outline' as const },
  { href: '/(tabs)/tasks', label: 'TASKS', icon: 'list-outline' as const },
  { href: '/(tabs)/history', label: 'HISTORY', icon: 'calendar-outline' as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // On Web/PWA, we want bottom: 0 relative to the padded frame, but we also 
  // ensure the component layout has enough internal padding to mask the home bar area.
  const navInsetStyle = Platform.OS === 'web'
    ? { 
        bottom: 0, 
        paddingBottom: Math.max(insets.bottom, 12),
      }
    : { 
        bottom: 0, 
        paddingBottom: Math.max(insets.bottom, 12),
      };

  return (
    <View style={[styles.nav, navInsetStyle]}>
      {NAV.map(({ href, label, icon }) => {
        const active = pathname.includes(label.toLowerCase());
        return (
          <TouchableOpacity
            key={href}
            onPress={() => router.replace(href as any)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Ionicons
              name={icon}
              size={20}
              color={active ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    ...shadows.pixelUp,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accentLight,
  },
  tabLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
  },
});
