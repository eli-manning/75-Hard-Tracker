export const ROCKET_UID = 'rq651qBc9oeTWx1mcBk9h3Wxh2t1';

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const SPACE_ACCENT = '#a78bfa'; // soft violet
const SPACE_BG     = '#03030f';

export const spaceColors = {
  bg:          SPACE_BG,
  surface:     '#0c0c2e',
  surface2:    '#14143e',
  border:      '#2e2e6a',
  text:        '#e2e2ff',
  textMuted:   '#8880bb',
  accent:      SPACE_ACCENT,
  accentLight: rgba(SPACE_ACCENT, 0.15),
  accentGlow:  rgba(SPACE_ACCENT, 0.5),
  green:       '#34d399',
  greenLight:  '#052e16',
  yellow:      '#fbbf24',
  yellowLight: '#1c1400',
  red:         '#f87171',
  redLight:    '#1c0505',
  black:       '#000000',
  white:       '#ffffff',
};
