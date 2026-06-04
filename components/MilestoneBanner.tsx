import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, fonts, shadows } from '../lib/theme';

interface MilestoneBannerProps {
  dayNum: number;
  onDismiss: () => void;
}

const MESSAGES: Record<number, string> = {
  25: '1/3 DONE. DON\'T STOP NOW.',
  50: '2/3 DONE. YOU\'VE COME TOO FAR.',
};

export function MilestoneBanner({ dayNum, onDismiss }: MilestoneBannerProps) {
  if (![25, 50, 75].includes(dayNum)) return null;

  if (dayNum === 75) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeading}>YOU DID IT.</Text>
            <Text style={styles.modalSubtitle}>75 DAYS. NO EXCUSES.</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{MESSAGES[dayNum]}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Text style={styles.dismissX}>X</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    ...shadows.glowAccent,
  },
  bannerText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
    flex: 1,
    lineHeight: 14,
  },
  dismissBtn: {
    padding: 8,
    marginLeft: 8,
  },
  dismissX: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.accent,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 32,
    alignItems: 'center',
    gap: 20,
    width: '100%',
    ...shadows.glowAccent,
  },
  modalHeading: {
    fontFamily: fonts.pixel,
    fontSize: 24,
    color: colors.accent,
    textAlign: 'center',
    lineHeight: 36,
  },
  modalSubtitle: {
    fontFamily: fonts.pixel,
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    marginTop: 8,
  },
  closeBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.accent,
  },
});
