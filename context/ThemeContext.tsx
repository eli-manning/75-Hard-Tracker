import { createContext, useContext, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';
import { colors } from '../lib/theme';
import { ROCKET_UID, spaceColors } from '../lib/rocketMode';

type ThemeColors = typeof colors;

interface ThemeContextValue {
  theme: ThemeColors;
  isRocketMode: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: colors,
  isRocketMode: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const isRocketMode = user?.uid === ROCKET_UID;
  const theme = isRocketMode ? (spaceColors as ThemeColors) : colors;

  return (
    <ThemeContext.Provider value={{ theme, isRocketMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
