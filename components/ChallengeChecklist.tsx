'use client';

import { useState } from 'react';
import { DayEntry } from '@/lib/types';
import { ChallengeItem } from './ChallengeItem';
import { WaterTracker } from './WaterTracker';

interface ChallengeChecklistProps {
  entry: DayEntry;
  readOnly: boolean;
  onUpdate: (updates: Partial<DayEntry>) => void;
  weightUnit?: 'lbs' | 'kg';
}

export function ChallengeChecklist({ entry, readOnly, onUpdate, weightUnit = 'lbs' }: ChallengeChecklistProps) {
  const [w1Duration, setW1Duration] = useState(entry.workoutOneDuration);
  const [w2Duration, setW2Duration] = useState(entry.workoutTwoDuration);
  const [weightInput, setWeightInput] = useState(entry.bodyWeight ? String(entry.bodyWeight) : '');

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  function computeAllCore(updates: Partial<DayEntry> = {}): boolean {
    const e = { ...entry, ...updates };
    return (
      e.workoutOneCompleted && e.workoutTwoCompleted && e.workoutTwoOutdoor &&
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

  const btnBase: React.CSSProperties = {
    ...pixelFont,
    fontSize: '7px',
    padding: '3px 10px',
    border: '2px solid var(--border)',
    boxShadow: '2px 2px 0 #000',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    ...pixelFont,
    fontSize: '7px',
    border: '2px solid var(--border)',
    background: 'var(--surface-2)',
    outline: 'none',
    color: 'var(--text)',
  };

  return (
    <div className="space-y-2">
      {/* Workout 1 */}
      <ChallengeItem label="Workout #1 — 45 min" icon="/images/workout1.png" completed={entry.workoutOneCompleted} readOnly={readOnly}
        onToggle={() => patch({ workoutOneCompleted: !entry.workoutOneCompleted })}>
        {!readOnly && (
          <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
            <input type="number" value={w1Duration}
              onChange={(e) => setW1Duration(Number(e.target.value))}
              onBlur={() => patch({ workoutOneDuration: w1Duration })}
              className="w-16 px-2 py-1" style={inputStyle} />
            <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>min</span>
          </div>
        )}
      </ChallengeItem>

      {/* Workout 2 */}
      <ChallengeItem label="Workout #2 — Outdoor" icon="/images/workout2.png"
        completed={entry.workoutTwoCompleted && entry.workoutTwoOutdoor} readOnly={readOnly}
        onToggle={() => { if (!entry.workoutTwoOutdoor) return; patch({ workoutTwoCompleted: !entry.workoutTwoCompleted }); }}
        disabled={!entry.workoutTwoOutdoor && !readOnly} disabledReason="Tap 'OUTDOOR' first">
        <div className="flex flex-wrap items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <input type="number" value={w2Duration}
                onChange={(e) => setW2Duration(Number(e.target.value))}
                onBlur={() => patch({ workoutTwoDuration: w2Duration })}
                className="w-16 px-2 py-1" style={inputStyle} />
              <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>min</span>
            </div>
          )}
          {!readOnly && (
            <button onClick={() => patch({
              workoutTwoOutdoor: !entry.workoutTwoOutdoor,
              workoutTwoCompleted: entry.workoutTwoCompleted && entry.workoutTwoOutdoor ? false : entry.workoutTwoCompleted,
            })} style={{
              ...pixelFont, fontSize: '7px', padding: '5px 12px',
              border: '2px solid',
              cursor: 'pointer',
              borderColor: entry.workoutTwoOutdoor ? 'var(--green)' : 'var(--accent)',
              boxShadow: entry.workoutTwoOutdoor ? 'var(--glow-green), 2px 2px 0 #000' : 'var(--glow-accent), 2px 2px 0 #000',
              background: entry.workoutTwoOutdoor ? 'var(--green-light)' : 'var(--accent-light)',
              color: entry.workoutTwoOutdoor ? 'var(--green)' : 'var(--accent)',
            }}>
              {entry.workoutTwoOutdoor ? 'OUTDOOR ✓' : '? OUTDOOR ?'}
            </button>
          )}
        </div>
      </ChallengeItem>

      {/* Diet */}
      <ChallengeItem label="No cheat meals today" icon="/images/diet.png" completed={entry.dietCompleted} readOnly={readOnly}
        onToggle={() => patch({ dietCompleted: !entry.dietCompleted })} />

      {/* Water */}
      <ChallengeItem label="Drink 1 gallon of water" icon="/images/water.png" completed={entry.waterCompleted} readOnly={readOnly}>
        <WaterTracker ozLogged={entry.waterOzLogged} goal={128} readOnly={readOnly} onAdd={addWater} onSetCustom={setWater} />
      </ChallengeItem>

      {/* Reading */}
      <ChallengeItem label="Read 10 pages" icon="/images/reading.png" completed={entry.readingCompleted} readOnly={readOnly}
        onToggle={() => { if (entry.readingCompleted) patch({ readingCompleted: false, pagesRead: 0 }); }}>
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3" style={{ border: '2px solid var(--border)', background: 'var(--bg)' }}>
              <div className="h-full transition-all duration-300" style={{
                width: `${Math.min(100, (entry.pagesRead / 10) * 100)}%`,
                background: entry.readingCompleted ? 'var(--green)' : 'var(--accent)',
                boxShadow: entry.readingCompleted ? 'var(--glow-green)' : entry.pagesRead > 0 ? 'var(--glow-accent)' : 'none',
              }} />
            </div>
            <span style={{ ...vt323, fontSize: '18px', color: entry.readingCompleted ? 'var(--green)' : 'var(--text-muted)', minWidth: 55 }}>
              {entry.pagesRead}/10 pg
            </span>
          </div>

          {!readOnly && (
            <>
              {/* Add + Reset pages */}
              <div className="flex gap-1.5 flex-wrap">
                <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)', alignSelf: 'center' }}>+</span>
                {[1, 5, 10].map((n) => (
                  <button key={n} onClick={() => addPages(n)} style={btnBase} className="active:translate-y-px transition-transform">
                    {n}pg
                  </button>
                ))}
                {entry.pagesRead > 0 && (
                  <button onClick={() => patch({ pagesRead: 0, readingCompleted: false })}
                    style={{ ...btnBase, color: 'var(--text-muted)' }}
                    className="active:translate-y-px transition-transform">
                    RESET
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </ChallengeItem>

      {/* Photo */}
      <ChallengeItem label="Progress photo" icon="/images/camera.png" completed={entry.photoCompleted} readOnly={readOnly}
        onToggle={() => patch({ photoCompleted: !entry.photoCompleted })}>
        {entry.photoCompleted && !readOnly && (
          <div className="mt-2 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(weightInput);
                if (!isNaN(val) && val > 0) patch({ bodyWeight: val });
              }}
              placeholder={`Weight (${weightUnit})`}
              style={{ ...inputStyle, width: 130 }}
              className="px-2 py-1"
            />
            <span style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>{weightUnit} (opt)</span>
          </div>
        )}
      </ChallengeItem>

      {/* Mood & Energy */}
      {!readOnly && (
        <div className="p-3 space-y-3" style={{ border: '2px solid var(--border)', background: 'var(--surface)' }}>
          <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>HOW ARE YOU FEELING? (optional)</p>

          <div className="space-y-2">
            <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>MOOD</p>
            <div className="flex gap-2">
              {(['😫', '😕', '😐', '🙂', '🤩'] as const).map((emoji, i) => {
                const val = i + 1;
                return (
                  <button key={val} onClick={(e) => { e.stopPropagation(); patch({ mood: entry.mood === val ? undefined : val }); }}
                    style={{
                      fontSize: '22px', padding: '4px 6px', border: '2px solid',
                      borderColor: entry.mood === val ? 'var(--accent)' : 'var(--border)',
                      background: entry.mood === val ? 'var(--accent-light)' : 'var(--bg)',
                      boxShadow: entry.mood === val ? 'var(--glow-accent)' : 'none',
                      cursor: 'pointer', transition: 'all 150ms',
                    }}>
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p style={{ ...pixelFont, fontSize: '6px', color: 'var(--text-muted)' }}>ENERGY</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button key={val} onClick={(e) => { e.stopPropagation(); patch({ energyLevel: entry.energyLevel === val ? undefined : val }); }}
                  style={{
                    ...pixelFont, fontSize: '8px', padding: '4px 8px', border: '2px solid',
                    borderColor: entry.energyLevel !== undefined && entry.energyLevel >= val ? 'var(--green)' : 'var(--border)',
                    background: entry.energyLevel !== undefined && entry.energyLevel >= val ? 'var(--green-light)' : 'var(--bg)',
                    boxShadow: entry.energyLevel !== undefined && entry.energyLevel >= val ? 'var(--glow-green)' : 'none',
                    color: entry.energyLevel !== undefined && entry.energyLevel >= val ? 'var(--green)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}>
                  {'▮'.repeat(val)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
