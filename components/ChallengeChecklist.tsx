import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { DayEntry, UserProfile } from '../lib/types';
import { ChallengeItem } from './ChallengeItem';
import { WaterTracker } from './WaterTracker';
import { fonts, shadows } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

interface ChallengeChecklistProps {
  entry: DayEntry;
  readOnly: boolean;
  onUpdate: (updates: Partial<DayEntry>) => void;
  weightUnit?: 'lbs' | 'kg';
  onNudge?: (taskKey: string, message: string) => void;
  nudgedTasks?: Set<string>;
  challengeMode?: '75hard' | 'general';
  hiddenCoreTasks?: UserProfile['hiddenCoreTasks'];
}

export function ChallengeChecklist({ entry, readOnly, onUpdate, weightUnit = 'lbs', onNudge, nudgedTasks, challengeMode, hiddenCoreTasks }: ChallengeChecklistProps) {
  const { theme } = useTheme();
  const [w1Duration, setW1Duration] = useState(String(entry.workoutOneDuration ?? 45));
  const [w2Duration, setW2Duration] = useState(String(entry.workoutTwoDuration ?? 45));
  const [weightInput, setWeightInput] = useState(entry.bodyWeight ? String(entry.bodyWeight) : '');
  const [logExpanded, setLogExpanded] = useState(!!(entry.bodyWeight || entry.mood || entry.energyLevel));

  useEffect(() => { setW1Duration(String(entry.workoutOneDuration ?? 45)); }, [entry.workoutOneDuration]);
  useEffect(() => { setW2Duration(String(entry.workoutTwoDuration ?? 45)); }, [entry.workoutTwoDuration]);
  useEffect(() => { if (entry.bodyWeight) setWeightInput(String(entry.bodyWeight)); }, [entry.bodyWeight]);

  function computeAllCore(updates: Partial<DayEntry> = {}): boolean {
    const e = { ...entry, ...updates };
    if (challengeMode !== 'general' || !hiddenCoreTasks) {
      const outdoorRequired = challengeMode !== 'general';
      return (
        e.workoutOneCompleted && e.workoutTwoCompleted && (!outdoorRequired || e.workoutTwoOutdoor) &&
        e.dietCompleted && e.waterCompleted && e.readingCompleted && e.photoCompleted
      );
    }
    const hidden = hiddenCoreTasks;
    const checks: boolean[] = [];
    if (!hidden.workout1) checks.push(e.workoutOneCompleted);
    if (!hidden.workout2) checks.push(e.workoutTwoCompleted);
    if (!hidden.diet)    checks.push(e.dietCompleted);
    if (!hidden.water)   checks.push(e.waterCompleted);
    if (!hidden.reading) checks.push(e.readingCompleted);
    if (!hidden.photo)   checks.push(e.photoCompleted);
    if (checks.length === 0) return (e.customTasksCompleted?.length ?? 0) > 0;
    return checks.every(Boolean);
  }

  function patch(updates: Partial<DayEntry>) {
    onUpdate({ ...updates, allCoreCompleted: computeAllCore(updates) });
  }

  function addWater(oz: number) {
    const waterOzLogged = Math.max(0, (entry.waterOzLogged ?? 0) + oz);
    patch({ waterOzLogged, waterCompleted: waterOzLogged >= 128 });
  }

  function setWater(oz: number) {
    const waterOzLogged = Math.max(0, oz);
    patch({ waterOzLogged, waterCompleted: waterOzLogged >= 128 });
  }

  function addPages(count: number) {
    const pagesRead = Math.max(0, (entry.pagesRead ?? 0) + count);
    patch({ pagesRead, readingCompleted: pagesRead >= 10 });
  }

  const moodLabels = ['LOW', 'MEH', 'OK', 'GOOD', 'GREAT'];
  const energyLabels = ['DRAINED', 'LOW', 'NORMAL', 'HIGH', 'PEAK'];

  const isHidden = (key: keyof NonNullable<UserProfile['hiddenCoreTasks']>) =>
    challengeMode === 'general' && hiddenCoreTasks?.[key] === true;

  const inputStyle = [styles.durationInput, { borderColor: theme.border, backgroundColor: theme.surface2, color: theme.text }];

  return (
    <View style={styles.list}>
      {/* Workout 1 */}
      {!isHidden('workout1') && (
        <ChallengeItem
          label="Workout #1 — 45 min"
          icon="/images/workout1.png"
          completed={entry.workoutOneCompleted}
          readOnly={readOnly}
          onToggle={() => patch({ workoutOneCompleted: !entry.workoutOneCompleted, workoutOneDuration: Number(w1Duration) || 45 })}
          onNudge={onNudge ? () => onNudge('workout1', "Get your first workout in today!") : undefined}
          nudgedAlready={nudgedTasks?.has('workout1')}
        >
          {!readOnly && (
            <View style={styles.durationRow}>
              <TextInput
                value={w1Duration}
                onChangeText={setW1Duration}
                onBlur={() => patch({ workoutOneDuration: Number(w1Duration) || 45, workoutOneCompleted: entry.workoutOneCompleted })}
                keyboardType="numeric"
                style={inputStyle}
                placeholderTextColor={theme.textMuted}
              />
              <Text style={[styles.durationUnit, { color: theme.textMuted }]}>min</Text>
            </View>
          )}
        </ChallengeItem>
      )}

      {/* Workout 2 */}
      {!isHidden('workout2') && (
        <ChallengeItem
          label="Workout #2 — Outdoor"
          icon="/images/workout2.png"
          completed={entry.workoutTwoCompleted && entry.workoutTwoOutdoor}
          readOnly={readOnly}
          onToggle={() => { if (!entry.workoutTwoOutdoor) return; patch({ workoutTwoCompleted: !entry.workoutTwoCompleted, workoutTwoDuration: Number(w2Duration) || 45 }); }}
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
                  onBlur={() => patch({ workoutTwoDuration: Number(w2Duration) || 45, workoutTwoCompleted: entry.workoutTwoCompleted })}
                  keyboardType="numeric"
                  style={inputStyle}
                  placeholderTextColor={theme.textMuted}
                />
                <Text style={[styles.durationUnit, { color: theme.textMuted }]}>min</Text>
              </View>
              <TouchableOpacity
                onPress={() => patch({
                  workoutTwoOutdoor: !entry.workoutTwoOutdoor,
                  workoutTwoCompleted: entry.workoutTwoCompleted && entry.workoutTwoOutdoor ? false : entry.workoutTwoCompleted,
                })}
                style={[
                  styles.outdoorBtn,
                  entry.workoutTwoOutdoor
                    ? { borderColor: theme.green, backgroundColor: theme.greenLight, ...shadows.glowGreen }
                    : { borderColor: theme.accent, backgroundColor: theme.accentLight, ...shadows.glowAccent },
                ]}
              >
                <Text style={[styles.outdoorBtnText, { color: entry.workoutTwoOutdoor ? theme.green : theme.accent }]}>
                  {entry.workoutTwoOutdoor ? 'OUTDOOR ✓' : '? OUTDOOR ?'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ChallengeItem>
      )}

      {/* Diet */}
      {!isHidden('diet') && (
        <ChallengeItem
          label="No cheat meals today"
          icon="/images/diet.png"
          completed={entry.dietCompleted}
          readOnly={readOnly}
          onToggle={() => patch({ dietCompleted: !entry.dietCompleted })}
          onNudge={onNudge ? () => onNudge('diet', "Stay strong on your diet today!") : undefined}
          nudgedAlready={nudgedTasks?.has('diet')}
        />
      )}

      {/* Water */}
      {!isHidden('water') && (
        <View nativeID="tutorial-water">
          <ChallengeItem
            label="Drink 1 gallon of water"
            icon="/images/water.png"
            completed={entry.waterCompleted}
            readOnly={readOnly}
            onNudge={onNudge ? () => onNudge('water', "Don't forget to drink your gallon of water!") : undefined}
            nudgedAlready={nudgedTasks?.has('water')}
          >
            <WaterTracker ozLogged={entry.waterOzLogged ?? 0} goal={128} readOnly={readOnly} onAdd={addWater} onSetCustom={setWater} />
          </ChallengeItem>
        </View>
      )}

      {/* Reading */}
      {!isHidden('reading') && (
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
              <View style={[styles.barTrack, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <View style={[
                  styles.barFill,
                  { width: `${Math.min(100, ((entry.pagesRead ?? 0) / 10) * 100)}%` as any },
                  { backgroundColor: entry.readingCompleted ? theme.green : theme.accent },
                ]} />
              </View>
              <Text style={[styles.pagesLabel, { color: entry.readingCompleted ? theme.green : theme.textMuted }]}>
                {entry.pagesRead ?? 0}/10 pg
              </Text>
            </View>
            {!readOnly && (
              <View style={styles.pageBtnRow}>
                <Text style={[styles.plus, { color: theme.textMuted }]}>+</Text>
                {[1, 5, 10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => addPages(n)}
                    style={[styles.pageBtn, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
                  >
                    <Text style={[styles.pageBtnText, { color: theme.text }]}>{n}pg</Text>
                  </TouchableOpacity>
                ))}
                {entry.pagesRead > 0 && (
                  <TouchableOpacity
                    onPress={() => patch({ pagesRead: 0, readingCompleted: false })}
                    style={[styles.pageBtn, { borderColor: theme.border, backgroundColor: theme.surface2 }]}
                  >
                    <Text style={[styles.pageBtnText, { color: theme.textMuted }]}>RESET</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ChallengeItem>
      )}

      {/* Photo */}
      {!isHidden('photo') && (
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
            <TouchableOpacity onPress={() => setLogExpanded((v) => !v)} style={styles.logToggle}>
              <Text style={[styles.logToggleText, { color: theme.textMuted }]}>
                {logExpanded ? '▼' : '▶'} LOG DAILY STATS (opt)
              </Text>
            </TouchableOpacity>

            {logExpanded && (
              <View style={[styles.logSection, { borderTopColor: theme.border }]}>
                {/* Weight */}
                <View style={styles.logField}>
                  <Text style={[styles.logFieldLabel, { color: theme.textMuted }]}>WEIGHT ({weightUnit})</Text>
                  <TextInput
                    value={weightInput}
                    onChangeText={setWeightInput}
                    onBlur={() => {
                      const val = parseFloat(weightInput);
                      if (!isNaN(val) && val > 0) patch({ bodyWeight: val });
                    }}
                    keyboardType="decimal-pad"
                    placeholder={`enter ${weightUnit}`}
                    placeholderTextColor={theme.textMuted}
                    style={[inputStyle, { width: 120 }]}
                  />
                </View>

                {/* Mood */}
                <View style={styles.logField}>
                  <View style={styles.logFieldHeaderRow}>
                    <Text style={[styles.logFieldLabel, { color: theme.textMuted }]}>MOOD</Text>
                    {entry.mood != null && (
                      <Text style={[styles.logFieldLabel, { color: theme.accent }]}>
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
                          { borderColor: theme.border, backgroundColor: theme.bg },
                          entry.mood === val && { borderColor: theme.accent, backgroundColor: theme.accentLight, ...shadows.glowAccent },
                        ]}
                      >
                        <Text style={[
                          styles.ratingBtnText,
                          { color: entry.mood === val ? theme.accent : theme.textMuted },
                        ]}>{val}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Energy */}
                <View style={styles.logField}>
                  <View style={styles.logFieldHeaderRow}>
                    <Text style={[styles.logFieldLabel, { color: theme.textMuted }]}>ENERGY</Text>
                    {entry.energyLevel != null && (
                      <Text style={[styles.logFieldLabel, { color: theme.green }]}>
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
                            { borderColor: theme.border, backgroundColor: theme.bg },
                            filled && { borderColor: theme.green, backgroundColor: theme.greenLight, ...shadows.glowGreen },
                          ]}
                        >
                          <Text style={[
                            styles.ratingBtnText,
                            { color: filled ? theme.green : theme.textMuted },
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
      )}
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationUnit: { fontFamily: fonts.pixel, fontSize: 6 },
  w2Controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },
  outdoorBtn: { paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, ...shadows.pixel },
  outdoorBtnText: { fontFamily: fonts.pixel, fontSize: 7 },
  readingContent: { gap: 8 },
  readingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 12, borderWidth: 2 },
  barFill: { height: '100%' },
  pagesLabel: { fontFamily: fonts.vt323, fontSize: 18, minWidth: 55 },
  pageBtnRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  plus: { fontFamily: fonts.pixel, fontSize: 6 },
  pageBtn: { paddingHorizontal: 10, paddingVertical: 3, borderWidth: 2, ...shadows.pixel },
  pageBtnText: { fontFamily: fonts.pixel, fontSize: 7 },
  logToggle: { padding: 0 },
  logToggleText: { fontFamily: fonts.pixel, fontSize: 6 },
  logSection: { marginTop: 12, gap: 16, paddingTop: 12, borderTopWidth: 1 },
  logField: { gap: 8 },
  logFieldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logFieldLabel: { fontFamily: fonts.pixel, fontSize: 6 },
  ratingRow: { flexDirection: 'row', gap: 6 },
  ratingBtn: { flex: 1, paddingVertical: 5, borderWidth: 2, alignItems: 'center' },
  ratingBtnText: { fontFamily: fonts.pixel, fontSize: 8 },
});
