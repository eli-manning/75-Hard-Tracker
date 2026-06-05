function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ── Edit these to retheme the entire app ────────────────────────────────────
const BG       = '#07080f';
const SURFACE  = '#0d0f1c';
const SURFACE2 = '#13172a';
const BORDER   = '#1c2240';
const ACCENT   = '#2563eb';

// Also update these files when changing BG:
//   app.json        → expo.splash.backgroundColor, expo.web.themeColor / backgroundColor
//   app.config.ts   → already imports BG below
//   scripts/inject-pwa-meta.js → background-color in injected CSS
// ────────────────────────────────────────────────────────────────────────────

export const BG_COLOR = BG;
export const ACCENT_COLOR = ACCENT;

export const colors = {
  bg:          BG,
  surface:     SURFACE,
  surface2:    SURFACE2,
  border:      BORDER,
  text:        '#ede0c4',
  textMuted:   '#6878a8',
  accent:      ACCENT,
  accentLight: rgba(ACCENT, 0.12),
  accentGlow:  rgba(ACCENT, 0.7),
  green:       '#4ecb6a',
  greenLight:  '#0a2210',
  yellow:      '#e8b020',
  yellowLight: '#1e1800',
  red:         '#f04545',
  redLight:    '#1f0808',
  black:       '#000000',
  white:       '#ffffff',
};

export const fonts = {
  pixel:        'PressStart2P_400Regular',
  vt323:        'VT323_400Regular',
  inter:        'Inter_400Regular',
  interSemiBold:'Inter_600SemiBold',
};

export const shadows = {
  pixel: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  pixelUp: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  glowAccent: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  glowGreen: {
    shadowColor: '#4ecb6a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
};
