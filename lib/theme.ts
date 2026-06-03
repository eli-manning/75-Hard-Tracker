export const colors = {
  bg: '#0c0b08',
  surface: '#161410',
  surface2: '#1e1b14',
  border: '#2a2620',
  text: '#ede0c4',
  textMuted: '#a89880',
  accent: '#e8643a',
  accentLight: '#2a1408',
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
