import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadows } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

const NAV_ALL = [
  { href: '/(tabs)/today',       label: '', icon: 'home-outline' as const,     match: 'today',       rocketHidden: false },
  { href: '/(tabs)/crews',       label: '', icon: 'people-outline' as const,    match: 'crews',       rocketHidden: true  },
  { href: '/(tabs)/history',     label: '', icon: 'calendar-outline' as const,  match: 'history',     rocketHidden: false },
  { href: '/(tabs)/leaderboard', label: '', icon: 'trophy-outline' as const,    match: 'leaderboard', rocketHidden: true  },
];

// Web: renders via a React DOM portal directly into document.body so it is
// completely outside the React Native container tree and all its overflow:hidden
// clipping. Uses plain HTML inline styles so env(safe-area-inset-bottom) is
// resolved by the browser natively, not filtered by RN's style processor.
function WebBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, isRocketMode } = useTheme();

  if (typeof document === 'undefined') return null;
  const { createPortal } = require('react-dom');

  const NAV = NAV_ALL.filter(n => !isRocketMode || !n.rocketHidden);

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
        backgroundColor: theme.surface,
        borderTop: `2px solid ${theme.border}`,
        boxShadow: isRocketMode
          ? `0 -3px 0 ${theme.accentGlow}`
          : '0 -3px 0 rgba(26,16,8,0.25)',
        zIndex: 9999,
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      }}
    >
      {NAV.map(({ href, label, icon, match }) => {
        const active = pathname.includes(match) ||
          (match === 'today' && pathname.startsWith('/tasks'));
        const tutorialId =
          match === 'today'       ? 'tutorial-nav-today' :
          match === 'crews'       ? 'tutorial-nav-crews' :
          match === 'history'     ? 'tutorial-nav-history' :
          match === 'leaderboard' ? 'tutorial-nav-leaderboard' :
          undefined;
        return (
          <button
            key={href}
            id={tutorialId}
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
              borderRight: `1px solid ${theme.border}`,
              background: active ? theme.accentLight : 'transparent',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            <Ionicons
              name={icon}
              size={20}
              color={active ? theme.accent : theme.textMuted}
            />
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '6px',
                color: active ? theme.accent : theme.textMuted,
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
  const { theme, isRocketMode } = useTheme();

  const NAV = NAV_ALL.filter(n => !isRocketMode || !n.rocketHidden);

  return (
    <View style={[
      styles.nav,
      { bottom: -insets.bottom, paddingBottom: insets.bottom, backgroundColor: theme.surface, borderTopColor: theme.border },
    ]}>
      {NAV.map(({ href, label, icon, match }) => {
        const active = pathname.includes(match) ||
          (match === 'today' && pathname.startsWith('/tasks'));
        return (
          <TouchableOpacity
            key={href}
            onPress={() => router.replace(href as any)}
            style={[styles.tab, { borderRightColor: theme.border }, active && { backgroundColor: theme.accentLight }]}
          >
            <Ionicons
              name={icon}
              size={20}
              color={active ? theme.accent : theme.textMuted}
            />
            <Text style={[styles.tabLabel, active ? { color: theme.accent } : { color: theme.textMuted }]}>
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
    borderTopWidth: 2,
    ...shadows.pixelUp,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderRightWidth: 1,
  },
  tabLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
  },
});
