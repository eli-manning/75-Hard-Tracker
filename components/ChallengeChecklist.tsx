'use client';

import { useState } from 'react';
import { DayEntry } from '@/lib/types';
import { ChallengeItem } from './ChallengeItem';
import { WaterTracker } from './WaterTracker';

interface ChallengeChecklistProps {
  entry: DayEntry;
  readOnly: boolean;
  onUpdate: (updates: Partial<DayEntry>) => void;
}

export function ChallengeChecklist({ entry, readOnly, onUpdate }: ChallengeChecklistProps) {
  const [w1Duration, setW1Duration] = useState(entry.workoutOneDuration);
  const [w2Duration, setW2Duration] = useState(entry.workoutTwoDuration);
  const [pagesInput, setPagesInput] = useState('');

  const pixelFont = { fontFamily: '"Press Start 2P", monospace' };
  const vt323 = { fontFamily: '"VT323", monospace' };

  function computeAllCore(updates: Partial<DayEntry> = {}): boolean {
    const e = { ...entry, ...updates };
    return (
      e.workoutOneCompleted &&
      e.workoutTwoCompleted &&
      e.workoutTwoOutdoor &&
      e.dietCompleted &&
      e.waterCompleted &&
      e.readingCompleted &&
      e.photoCompleted
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
    const pagesRead = entry.pagesRead + count;
    patch({ pagesRead, readingCompleted: pagesRead >= 10 });
  }

  function submitPages(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(pagesInput);
    if (!isNaN(val) && val > 0) { addPages(val); setPagesInput(''); }
  }

  const btnStyle = {
    ...pixelFont,
    fontSize: '7px',
    padding: '3px 10px',
    border: '2px solid var(--border)',
    boxShadow: '2px 2px 0 #000',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    cursor: 'pointer',
  };

  const inputStyle = {
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
      <ChallengeItem label="Workout #1 — 45 min" completed={entry.workoutOneCompleted} readOnly={readOnly}
        onToggle={() => patch({ workoutOneCompleted: !entry.workoutOneCompleted })}>
        {!readOnly && (
          <div className="flex items-center gap-2 mt-1">
            <input type="number" value={w1Duration}
              onChange={(e) => setW1Duration(Number(e.target.value))}
              onBlur={() => patch({ workoutOneDuration: w1Duration })}
              className="w-16 px-2 py-1" style={inputStyle} />
            <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>min</span>
          </div>
        )}
      </ChallengeItem>

      {/* Workout 2 */}
      <ChallengeItem label="Workout #2 — Outdoor" completed={entry.workoutTwoCompleted && entry.workoutTwoOutdoor}
        readOnly={readOnly}
        onToggle={() => { if (!entry.workoutTwoOutdoor) return; patch({ workoutTwoCompleted: !entry.workoutTwoCompleted }); }}
        disabled={!entry.workoutTwoOutdoor && !readOnly} disabledReason="Confirm outdoor first">
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {!readOnly && (
            <div className="flex items-center gap-2">
              <input type="number" value={w2Duration}
                onChange={(e) => setW2Duration(Number(e.target.value))}
                onBlur={() => patch({ workoutTwoDuration: w2Duration })}
                className="w-16 px-2 py-1" style={inputStyle} />
              <span style={{ ...pixelFont, fontSize: '7px', color: 'var(--text-muted)' }}>min</span>
            </div>
          )}
          <button
            onClick={readOnly ? undefined : () => patch({
              workoutTwoOutdoor: !entry.workoutTwoOutdoor,
              workoutTwoCompleted: entry.workoutTwoCompleted && entry.workoutTwoOutdoor ? false : entry.workoutTwoCompleted,
            })}
            style={{
              ...pixelFont, fontSize: '7px', padding: '3px 10px',
              border: '2px solid',
              borderColor: entry.workoutTwoOutdoor ? 'var(--green)' : 'var(--border)',
              boxShadow: entry.workoutTwoOutdoor ? 'var(--glow-green), 2px 2px 0 #000' : '2px 2px 0 #000',
              background: entry.workoutTwoOutdoor ? 'var(--green-light)' : 'var(--surface-2)',
              color: entry.workoutTwoOutdoor ? 'var(--green)' : 'var(--text-muted)',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            {entry.workoutTwoOutdoor ? 'OUTDOOR ✓' : 'INDOOR'}
          </button>
        </div>
      </ChallengeItem>

      {/* Diet */}
      <ChallengeItem label="No cheat meals today" completed={entry.dietCompleted} readOnly={readOnly}
        onToggle={() => patch({ dietCompleted: !entry.dietCompleted })} />

      {/* Water */}
      <ChallengeItem label="Drink 1 gallon of water" completed={entry.waterCompleted} readOnly={readOnly}>
        <WaterTracker ozLogged={entry.waterOzLogged} goal={128} readOnly={readOnly} onAdd={addWater} onSetCustom={setWater} />
      </ChallengeItem>

      {/* Reading */}
      <ChallengeItem label="Read 10 pages" completed={entry.readingCompleted} readOnly={readOnly}
        onToggle={() => { if (entry.readingCompleted) patch({ readingCompleted: false, pagesRead: 0 }); }}>
        <div className="mt-2 space-y-2">
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
            <div className="flex gap-2 flex-wrap">
              {[1, 5].map((n) => (
                <button key={n} onClick={() => addPages(n)} style={btnStyle as React.CSSProperties}>+{n}</button>
              ))}
              <form onSubmit={submitPages} className="flex gap-1">
                <input type="number" value={pagesInput} onChange={(e) => setPagesInput(e.target.value)}
                  placeholder="pg" className="w-12 px-2 py-1" style={inputStyle} />
                <button type="submit" style={btnStyle as React.CSSProperties}>ADD</button>
              </form>
            </div>
          )}
        </div>
      </ChallengeItem>

      {/* Photo */}
      <ChallengeItem label="Progress photo" completed={entry.photoCompleted} readOnly={readOnly}
        onToggle={() => patch({ photoCompleted: !entry.photoCompleted })} />
    </div>
  );
}
