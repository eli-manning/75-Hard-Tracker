import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { colors, fonts } from '../lib/theme';

export function InstallPrompt() {
  const { canInstall, isIOS, showPrompt, triggerInstall } = useInstallPrompt();

  if (Platform.OS !== 'web' || !showPrompt) return null;

  if (isIOS) {
    return (
      <View style={styles.iosBox}>
        <View style={styles.iosHeader}>
          <Ionicons name="share-outline" size={13} color={colors.accent} />
          <Text style={styles.iosTitle}>ADD TO HOME SCREEN</Text>
        </View>
        <Text style={styles.iosBody}>
          Tap the <Text style={styles.bold}>Share</Text> icon in Safari, then{' '}
          <Text style={styles.bold}>"Add to Home Screen"</Text>
        </Text>
      </View>
    );
  }

  if (canInstall) {
    return (
      <TouchableOpacity style={styles.installBtn} onPress={triggerInstall} activeOpacity={0.8}>
        <Ionicons name="download-outline" size={13} color={colors.accent} />
        <Text style={styles.installText}>ADD TO HOME SCREEN</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  iosBox: {
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    gap: 8,
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iosTitle: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
  },
  iosBody: {
    fontFamily: fonts.inter,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  bold: {
    color: colors.text,
    fontFamily: fonts.interSemiBold,
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  installText: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.accent,
  },
});
