import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, fonts, shadows } from '../lib/theme';

interface RestartModalProps {
  visible: boolean;
  onConfirm: (opts: { keepPoints: boolean; keepLongestStreak: boolean }) => void;
  onCancel: () => void;
  cancellable?: boolean;
}

export function RestartModal({ visible, onConfirm, onCancel, cancellable = true }: RestartModalProps) {
  const [step, setStep] = useState(1);
  const [keepPoints, setKeepPoints] = useState(false);
  const [keepLongestStreak, setKeepLongestStreak] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setKeepPoints(false);
      setKeepLongestStreak(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancellable ? onCancel : undefined}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.heading}>FAILED THE CHALLENGE</Text>
              <Text style={styles.body}>
                This will reset your streak and start date. This cannot be undone.
              </Text>
              <View style={styles.buttonRow}>
                {cancellable && (
                  <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setStep(2)} style={styles.continueBtn}>
                  <Text style={styles.continueBtnText}>CONTINUE</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heading}>ARE YOU SURE?</Text>
              <View style={styles.checkboxList}>
                <TouchableOpacity
                  onPress={() => setKeepPoints((v) => !v)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, keepPoints && styles.checkboxChecked]}>
                    {keepPoints && <Text style={styles.checkmark}>X</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>KEEP MY TOTAL POINTS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setKeepLongestStreak((v) => !v)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, keepLongestStreak && styles.checkboxChecked]}>
                    {keepLongestStreak && <Text style={styles.checkmark}>X</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>KEEP MY LONGEST STREAK</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => onConfirm({ keepPoints, keepLongestStreak })}
                style={styles.restartBtn}
              >
                <Text style={styles.restartBtnText}>YES, RESTART</Text>
              </TouchableOpacity>
              {cancellable && (
                <TouchableOpacity onPress={onCancel} style={styles.textCancelBtn}>
                  <Text style={styles.textCancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.red,
    padding: 24,
    width: '100%',
    maxWidth: 432,
    gap: 16,
    ...shadows.pixel,
  },
  heading: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.red,
    lineHeight: 18,
  },
  body: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
    lineHeight: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.textMuted,
  },
  continueBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.white,
  },
  checkboxList: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.red,
    backgroundColor: colors.redLight,
  },
  checkmark: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.red,
  },
  checkboxLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.text,
    flex: 1,
    lineHeight: 12,
  },
  restartBtn: {
    paddingVertical: 14,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  restartBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.white,
  },
  textCancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textCancelBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
  },
});
