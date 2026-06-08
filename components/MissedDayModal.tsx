import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts, shadows } from '../lib/theme';
import { DayEntry } from '../lib/types';

interface MissedDayModalProps {
  visible: boolean;
  yesterdayEntry: DayEntry;
  onMissed: () => void;
  onSaved: (patch: Partial<DayEntry>) => void;
  onDismiss: () => void;
}

export function MissedDayModal({ visible, yesterdayEntry, onMissed, onSaved, onDismiss }: MissedDayModalProps) {
  const [modalState, setModalState] = useState<'ask' | 'logging'>('ask');
  const [workoutOneMins, setWorkoutOneMins] = useState(String(yesterdayEntry.workoutOneDuration ?? 45));
  const [workoutTwoMins, setWorkoutTwoMins] = useState(String(yesterdayEntry.workoutTwoDuration ?? 45));
  const [waterOz, setWaterOz] = useState(String(yesterdayEntry.waterOzLogged ?? 0));
  const [pagesRead, setPagesRead] = useState(String(yesterdayEntry.pagesRead ?? 0));
  const [dietDone, setDietDone] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);

  function handleSave() {
    const patch: Partial<DayEntry> = {};
    if (!yesterdayEntry.workoutOneCompleted) {
      const mins = parseInt(workoutOneMins, 10);
      patch.workoutOneDuration = isNaN(mins) ? 0 : mins;
      patch.workoutOneCompleted = !isNaN(mins) && mins > 0;
    }
    if (!yesterdayEntry.workoutTwoCompleted) {
      const mins = parseInt(workoutTwoMins, 10);
      patch.workoutTwoDuration = isNaN(mins) ? 0 : mins;
      patch.workoutTwoCompleted = !isNaN(mins) && mins > 0;
    }
    if (!yesterdayEntry.waterCompleted) {
      const oz = parseInt(waterOz, 10);
      patch.waterOzLogged = isNaN(oz) ? 0 : oz;
      patch.waterCompleted = !isNaN(oz) && oz >= 128;
    }
    if (!yesterdayEntry.readingCompleted) {
      const pages = parseInt(pagesRead, 10);
      patch.pagesRead = isNaN(pages) ? 0 : pages;
      patch.readingCompleted = !isNaN(pages) && pages > 0;
    }
    if (!yesterdayEntry.dietCompleted) {
      patch.dietCompleted = dietDone;
    }
    if (!yesterdayEntry.photoCompleted) {
      patch.photoCompleted = photoDone;
    }
    onSaved(patch);
    onDismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {modalState === 'ask' ? (
            <>
              <Text style={styles.heading}>DID YOU MISS YESTERDAY?</Text>
              <Text style={styles.body}>We noticed yesterday wasn't fully completed.</Text>
              <TouchableOpacity onPress={onMissed} style={styles.missedBtn}>
                <Text style={styles.missedBtnText}>YES, I MISSED IT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalState('logging')} style={styles.forgotBtn}>
                <Text style={styles.forgotBtnText}>NO, I FORGOT TO LOG</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.heading}>LOG YESTERDAY</Text>
              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                  {!yesterdayEntry.workoutOneCompleted && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WORKOUT 1 MINS</Text>
                      <TextInput
                        value={workoutOneMins}
                        onChangeText={setWorkoutOneMins}
                        keyboardType="numeric"
                        style={styles.textInput}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}
                  {!yesterdayEntry.workoutTwoCompleted && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WORKOUT 2 MINS</Text>
                      <TextInput
                        value={workoutTwoMins}
                        onChangeText={setWorkoutTwoMins}
                        keyboardType="numeric"
                        style={styles.textInput}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}
                  {!yesterdayEntry.waterCompleted && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WATER OZ</Text>
                      <TextInput
                        value={waterOz}
                        onChangeText={setWaterOz}
                        keyboardType="numeric"
                        style={styles.textInput}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}
                  {!yesterdayEntry.readingCompleted && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>PAGES READ</Text>
                      <TextInput
                        value={pagesRead}
                        onChangeText={setPagesRead}
                        keyboardType="numeric"
                        style={styles.textInput}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}
                  {!yesterdayEntry.dietCompleted && (
                    <TouchableOpacity
                      onPress={() => setDietDone((v) => !v)}
                      style={styles.checkboxRow}
                    >
                      <View style={[styles.checkbox, dietDone && styles.checkboxChecked]}>
                        {dietDone && <Text style={styles.checkmark}>X</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>DIET FOLLOWED</Text>
                    </TouchableOpacity>
                  )}
                  {!yesterdayEntry.photoCompleted && (
                    <TouchableOpacity
                      onPress={() => setPhotoDone((v) => !v)}
                      style={styles.checkboxRow}
                    >
                      <View style={[styles.checkbox, photoDone && styles.checkboxChecked]}>
                        {photoDone && <Text style={styles.checkmark}>X</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>PROGRESS PHOTO TAKEN</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>SAVE & CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalState('ask')} style={styles.backBtn}>
                <Text style={styles.backBtnText}>BACK</Text>
              </TouchableOpacity>
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
    borderColor: colors.accent,
    padding: 24,
    width: '100%',
    maxWidth: 432,
    gap: 14,
    maxHeight: '80%',
  },
  heading: {
    fontFamily: fonts.pixel,
    fontSize: 10,
    color: colors.accent,
    lineHeight: 18,
  },
  body: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
    lineHeight: 12,
  },
  missedBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
  },
  missedBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.red,
  },
  forgotBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  forgotBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
  },
  formScroll: {
    maxHeight: 300,
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
  },
  textInput: {
    fontFamily: fonts.vt323,
    fontSize: 22,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  checkmark: {
    fontFamily: fonts.pixel,
    fontSize: 7,
    color: colors.accent,
  },
  checkboxLabel: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.text,
    flex: 1,
    lineHeight: 12,
  },
  saveBtn: {
    paddingVertical: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 9,
    color: colors.white,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    color: colors.textMuted,
  },
});
