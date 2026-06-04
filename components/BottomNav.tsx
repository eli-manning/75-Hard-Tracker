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

// Web: renders via a React DOM portal directly into document.body so it is
// completely outside the React Native container tree and all its overflow:hidden
// clipping. Uses plain HTML inline styles so env(safe-area-inset-bottom) is
// resolved by the browser natively, not filtered by RN's style processor.
function WebBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (typeof document === 'undefined') return null;
  const { createPortal } = require('react-dom');

  const nav = (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(-1 * env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        backgroundColor: colors.surface,
        borderTop: `2px solid ${colors.border}`,
        boxShadow: '0 -4px 0 #000',
        zIndex: 9999,
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      }}
    >
      {NAV.map(({ href, label, icon }) => {
        const active = pathname.includes(label.toLowerCase());
        return (
          <button
            key={href}
            onClick={() => router.replace(href as any)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '12px',
              paddingBottom: '12px',
              gap: '4px',
              border: 'none',
              borderRight: `1px solid ${colors.border}`,
              background: active ? colors.accentLight : 'transparent',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <Ionicons
              name={icon}
              size={20}
              color={active ? colors.accent : colors.textMuted}
            />
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: active ? colors.accent : colors.textMuted,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return createPortal(nav, document.body) as any;
}

function NativeBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.nav, { bottom: -insets.bottom, paddingBottom: insets.bottom }]}>
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

export const BottomNav = Platform.OS === 'web' ? WebBottomNav : NativeBottomNav;

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
