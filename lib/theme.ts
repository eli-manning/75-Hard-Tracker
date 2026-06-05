export const colors = {
  bg: '#0c1018',
  surface: '#131a2a',
  surface2: '#1b2438',
  border: '#263354',
  text: '#ede0c4',
  textMuted: '#8899bb',
  accent: '#5b8cf0',
  accentLight: '#0d1a3a',
  green: '#4ecb6a',
  greenLight: '#0a2210',
  yellow: '#e8b020',
  yellowLight: '#1e1800',
  red: '#d43232',
  redLight: '#220a0a',
  black: '#000000',
  white: '#ffffff',
};

export const fonts = {
  pixel: 'PressStart2P_400Regular',
  vt323: 'VT323_400Regular',
  inter: 'Inter_400Regular',
  interSemiBold: 'Inter_600SemiBold',
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
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  glowGreen: {
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
};
