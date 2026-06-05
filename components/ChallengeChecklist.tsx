import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { DayEntry } from '../lib/types';
import { ChallengeItem } from './ChallengeItem';
import { WaterTracker } from './WaterTracker';
import { colors, fonts, shadows } from '../lib/theme';

interface ChallengeChecklistProps {
  entry: DayEntry;
  readOnly: boolean;
  onUpdate: (updates: Partial<DayEntry>) => void;
  weightUnit?: 'lbs' | 'kg';
  onNudge?: (taskKey: string, message: string) => void;
  nudgedTasks?: Set<string>;
  challengeMode?: '75hard' | 'general';
}

export function ChallengeChecklist({ entry, readOnly, onUpdate, weightUnit = 'lbs', onNudge, nudgedTasks, challengeMode }: ChallengeChecklistProps) {
  const [w1Duration, setW1Duration] = useState(String(entry.workoutOneDuration));
  const [w2Duration, setW2Duration] = useState(String(entry.workoutTwoDuration));
  const [weightInput, setWeightInput] = useState(entry.bodyWeight ? String(entry.bodyWeight) : '');
  const [logExpanded, setLogExpanded] = useState(!!(entry.bodyWeight || entry.mood || entry.energyLevel));

  useEffect(() => { setW1Duration(String(entry.workoutOneDuration)); }, [entry.workoutOneDuration]);
  useEffect(() => { setW2Duration(String(entry.workoutTwoDuration)); }, [entry.workoutTwoDuration]);
  useEffect(() => { if (entry.bodyWeight) setWeightInput(String(entry.bodyWeight)); }, [entry.bodyWeight]);

  function computeAllCore(updates: Partial<DayEntry> = {}): boolean {
    const e = { ...entry, ...updates };
    const outdoorRequired = challengeMode !== 'general';
    return (
      e.workoutOneCompleted && e.workoutTwoCompleted && (!outdoorRequired || e.workoutTwoOutdoor) &&
      e.dietCompleted && e.waterCompleted && e.readingCompleted && e.photoCompleted
    );
  }

  function patch(updates: Partial<DayEntry>) {
    onUpdate({ ...updates, allCoreCompleted: computeAllCore(updates) });
  }

  function addWater(oz: number) {
    const waterOzLogged = Math.max(0, entry.waterOzLogged + oz);
    patch({ waterOzLogged, waterCompleted: waterOzLogged >= 128 });
  }

  function setWater(oz: number) {
    const waterOzLogged = Math.max(0, oz);
    patch({ waterOzLogged, waterCompleted: waterOzLogged >= 128 });
  }

  function addPages(count: number) {
    const pagesRead = Math.max(0, entry.pagesRead + count);
    patch({ pagesRead, readingCompleted: pagesRead >= 10 });
  }

  const moodLabels = ['LOW', 'MEH', 'OK', 'GOOD', 'GREAT'];
  const energyLabels = ['DRAINED', 'LOW', 'NORMAL', 'HIGH', 'PEAK'];

  return (
    <View style={styles.list}>
      {/* Workout 1 */}
      <ChallengeItem
        label="Workout #1 — 45 min"
        icon="/images/workout1.png"
        completed={entry.workoutOneCompleted}
        readOnly={readOnly}
        onToggle={() => patch({ workoutOneCompleted: !entry.workoutOneCompleted })}
        onNudge={onNudge ? () => onNudge('workout1', "Get your first workout in today!") : undefined}
        nudgedAlready={nudgedTasks?.has('workout1')}
      >
        {!readOnly && (
          <View style={styles.durationRow}>
            <TextInput
              value={w1Duration}
              onChangeText={setW1Duration}
              onBlur={() => patch({ workoutOneDuration: Number(w1Duration) || 45 })}
              keyboardType="numeric"
              style={styles.durationInput}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.durationUnit}>min</Text>
          </View>
        )}
      </ChallengeItem>

      {/* Workout 2 */}
      <ChallengeItem
        label="Workout #2 — Outdoor"
        icon="/images/workout2.png"
        completed={entry.workoutTwoCompleted && entry.workoutTwoOutdoor}
        readOnly={readOnly}
        onToggle={() => { if (!entry.workoutTwoOutdoor) return; patch({ workoutTwoCompleted: !entry.workoutTwoCompleted }); }}
        disabled={!entry.workoutTwoOutdoor && !readOnly}
        disabledReason="Tap 'OUTDOOR' first"
        onNudge={onNudge ? () => onNudge('workout2', "Your outdoor workout is waiting!") : undefined}
        nudgedAlready={nudgedTasks?.has('workout2')}
      >
        {!readOnly && (
          <View style={styles.w2Controls}>
            <View style={styles.durationRow}>
              <TextInput
                value={w2Duration}
                onChangeText={setW2Duration}
                onBlur={() => patch({ workoutTwoDuration: Number(w2Duration) || 45 })}
                keyboardType="numeric"
                style={styles.durationInput}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.durationUnit}>min</Text>
            </View>
            <TouchableOpacity
              onPress={() => patch({
                workoutTwoOutdoor: !entry.workoutTwoOutdoor,
                workoutTwoCompleted: entry.workoutTwoCompleted && entry.workoutTwoOutdoor ? false : entry.workoutTwoCompleted,
              })}
              style={[
                styles.outdoorBtn,
                entry.workoutTwoOutdoor ? styles.outdoorBtnActive : styles.outdoorBtnInactive,
              ]}
            >
              <Text style={[
                styles.outdoorBtnText,
                entry.workoutTwoOutdoor ? styles.outdoorBtnTextGreen : styles.outdoorBtnTextAccent,
              ]}>
                {entry.workoutTwoOutdoor ? 'OUTDOOR ✓' : '? OUTDOOR ?'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ChallengeItem>

      {/* Diet */}
      <ChallengeItem
        label="No cheat meals today"
        icon="/images/diet.png"
        completed={entry.dietCompleted}
        readOnly={readOnly}
        onToggle={() => patch({ dietCompleted: !entry.dietCompleted })}
        onNudge={onNudge ? () => onNudge('diet', "Stay strong on your diet today!") : undefined}
        nudgedAlready={nudgedTasks?.has('diet')}
      />

      {/* Water */}
      <ChallengeItem
        label="Drink 1 gallon of water"
        icon="/images/water.png"
        completed={entry.waterCompleted}
        readOnly={readOnly}
        onNudge={onNudge ? () => onNudge('water', "Don't forget to drink your gallon of water!") : undefined}
        nudgedAlready={nudgedTasks?.has('water')}
      >
        <WaterTracker ozLogged={entry.waterOzLogged} goal={128} readOnly={readOnly} onAdd={addWater} onSetCustom={setWater} />
      </ChallengeItem>

      {/* Reading */}
      <ChallengeItem
        label="Read 10 pages"
        icon="/images/reading.png"
        completed={entry.readingCompleted}
        readOnly={readOnly}
        onToggle={() => { if (entry.readingCompleted) patch({ readingCompleted: false, pagesRead: 0 }); }}
        onNudge={onNudge ? () => onNudge('reading', "Time to hit those 10 pages!") : undefined}
        nudgedAlready={nudgedTasks?.has('reading')}
      >
        <View style={styles.readingContent}>
          <View style={styles.readingBarRow}>
            <View style={styles.barTrack}>
              <View style={[
                styles.barFill,
                { width: `${Math.min(100, (entry.pagesRead / 10) * 100)}%` as any },
                entry.readingCompleted ? styles.barFillDone : styles.barFillAccent,
              ]} />
            </View>
            <Text style={[styles.pagesLabel, entry.readingCompleted && styles.pagesLabelDone]}>
              {entry.pagesRead}/10 pg
            </Text>
          </View>
          {!readOnly && (
            <View style={styles.pageBtnRow}>
              <Text style={styles.plus}>+</Text>
              {[1, 5, 10].map((n) => (
                <TouchableOpacity key={n} onPress={() => addPages(n)} style={styles.pageBtn}>
                  <Text style={styles.pageBtnText}>{n}pg</Text>
                </TouchableOpacity>
              ))}
              {entry.pagesRead > 0 && (
                <TouchableOpacity
                  onPress={() => patch({ pagesRead: 0, readingCompleted: false })}
                  style={styles.pageBtn}
                >
                  <Text style={[styles.pageBtnText, { color: colors.textMuted }]}>RESET</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ChallengeItem>

      {/* Photo */}
      <ChallengeItem
        label="Progress photo"
        icon="/images/camera.png"
        completed={entry.photoCompleted}
        readOnly={readOnly}
        onToggle={() => patch({ photoCompleted: !entry.photoCompleted })}
        onNudge={onNudge ? () => onNudge('photo', "Take that progress photo!") : undefined}
        nudgedAlready={nudgedTasks?.has('photo')}
      >
        {!readOnly && (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => setLogExpanded((v) => !v)}
              style={styles.logToggle}
            >
              <Text style={styles.logToggleText}>
                {logExpanded ? '▼' : '▶'} LOG DAILY STATS (opt)
              </Text>
            </TouchableOpacity>

            {logExpanded && (
              <View style={styles.logSection}>
                {/* Weight */}
                <View style={styles.logField}>
                  <Text style={styles.logFieldLabel}>WEIGHT ({weightUnit})</Text>
                  <TextInput
                    value={weightInput}
                    onChangeText={setWeightInput}
                    onBlur={() => {
                      const val = parseFloat(weightInput);
                      if (!isNaN(val) && val > 0) patch({ bodyWeight: val });
                    }}
                    keyboardType="decimal-pad"
                    placeholder={`enter ${weightUnit}`}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.durationInput, { width: 120 }]}
                  />
                </View>

                {/* Mood */}
                <View style={styles.logField}>
                  <View style={styles.logFieldHeaderRow}>
                    <Text style={styles.logFieldLabel}>MOOD</Text>
                    {entry.mood != null && (
                      <Text style={[styles.logFieldLabel, { color: colors.accent }]}>
                        {moodLabels[entry.mood - 1]}
                      </Text>
                    )}
                  </View>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <TouchableOpacity
                        key={val}
                        onPress={() => patch({ mood: entry.mood === val ? undefined : val })}
                        style={[
                          styles.ratingBtn,
                          entry.mood === val && styles.ratingBtnAccentActive,
                        ]}
                      >
                        <Text style={[
                          styles.ratingBtnText,
                          entry.mood === val ? styles.ratingBtnTextAccent : styles.ratingBtnTextMuted,
                        ]}>{val}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Energy */}
                <View style={styles.logField}>
                  <View style={styles.logFieldHeaderRow}>
                    <Text style={styles.logFieldLabel}>ENERGY</Text>
                    {entry.energyLevel != null && (
                      <Text style={[styles.logFieldLabel, { color: colors.green }]}>
                        {energyLabels[entry.energyLevel - 1]}
                      </Text>
                    )}
                  </View>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((val) => {
                      const filled = entry.energyLevel !== undefined && entry.energyLevel >= val;
                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => patch({ energyLevel: entry.energyLevel === val ? undefined : val })}
                          style={[
                            styles.ratingBtn,
                            filled && styles.ratingBtnGreenActive,
                          ]}
                        >
                          <Text style={[
                            styles.ratingBtnText,
                            filled ? styles.ratingBtnTextGreen : styles.ratingBtnTextMuted,
                          ]}>{val}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ChallengeItem>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  durationInput: {
    width: 64,
    fontFamily: fonts.pixel,
    fontSize: 7,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationUnit: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  w2Controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },
  outdoorBtn: { paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, ...shadows.pixel },
  outdoorBtnActive: { borderColor: colors.green, backgroundColor: colors.greenLight, ...shadows.glowGreen },
  outdoorBtnInactive: { borderColor: colors.accent, backgroundColor: colors.accentLight, ...shadows.glowAccent },
  outdoorBtnText: { fontFamily: fonts.pixel, fontSize: 7 },
  outdoorBtnTextGreen: { color: colors.green },
  outdoorBtnTextAccent: { color: colors.accent },
  readingContent: { gap: 8 },
  readingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  barFill: { height: '100%' },
  barFillAccent: { backgroundColor: colors.accent },
  barFillDone: { backgroundColor: colors.green },
  pagesLabel: { fontFamily: fonts.vt323, fontSize: 18, color: colors.textMuted, minWidth: 55 },
  pagesLabelDone: { color: colors.green },
  pageBtnRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  plus: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  pageBtn: { paddingHorizontal: 10, paddingVertical: 3, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface2, ...shadows.pixel },
  pageBtnText: { fontFamily: fonts.pixel, fontSize: 7, color: colors.text },
  logToggle: { padding: 0 },
  logToggleText: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  logSection: { marginTop: 12, gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  logField: { gap: 8 },
  logFieldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logFieldLabel: { fontFamily: fonts.pixel, fontSize: 6, color: colors.textMuted },
  ratingRow: { flexDirection: 'row', gap: 6 },
  ratingBtn: {
    flex: 1, paddingVertical: 5, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.bg, alignItems: 'center',
  },
  ratingBtnAccentActive: { borderColor: colors.accent, backgroundColor: colors.accentLight, ...shadows.glowAccent },
  ratingBtnGreenActive: { borderColor: colors.green, backgroundColor: colors.greenLight, ...shadows.glowGreen },
  ratingBtnText: { fontFamily: fonts.pixel, fontSize: 8 },
  ratingBtnTextMuted: { color: colors.textMuted },
  ratingBtnTextAccent: { color: colors.accent },
  ratingBtnTextGreen: { color: colors.green },
});
