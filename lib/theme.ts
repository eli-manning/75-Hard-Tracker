function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ── Edit these to retheme the entire app ────────────────────────────────────
const BG       = '#ede0c4';  // cream parchment (logo text/highlight colour)
const SURFACE  = '#e0cfad';  // slightly deeper cream for cards
const SURFACE2 = '#d4c09a';  // secondary surface
const BORDER   = '#b8a07a';  // warm tan border
const ACCENT   = '#2d4070';  // the shield's own navy — designed to sit on cream

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
  text:        '#1a2030',     // dark navy (shield body colour)
  textMuted:   '#5a6880',     // muted blue-grey readable on cream
  accent:      ACCENT,
  accentLight: rgba(ACCENT, 0.10),
  accentGlow:  rgba(ACCENT, 0.5),
  green:       '#1a6b35',     // darkened for contrast on light bg
  greenLight:  '#d0f0dc',
  yellow:      '#8a5f00',     // dark amber
  yellowLight: '#f5e4a0',
  red:         '#b02828',     // darkened for contrast on light bg
  redLight:    '#f8d5d5',
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
    shadowColor: '#1a1008',  // warm near-black — softer than pure #000 on cream
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 3,
  },
  pixelUp: {
    shadowColor: '#1a1008',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
  },
  glowAccent: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  glowGreen: {
    shadowColor: '#1a6b35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
};
