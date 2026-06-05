import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface NavVisibilityContextValue {
  navHidden: boolean;
  setNavHidden: (v: boolean) => void;
}

const NavVisibilityContext = createContext<NavVisibilityContextValue>({
  navHidden: false,
  setNavHidden: () => {},
});

export function NavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [navHidden, setNavHidden] = useState(false);
  const set = useCallback((v: boolean) => setNavHidden(v), []);
  return (
    <NavVisibilityContext.Provider value={{ navHidden, setNavHidden: set }}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

export function useNavVisibility() {
  return useContext(NavVisibilityContext);
}

export function useHideNavWhileLoading(isLoading: boolean) {
  const { setNavHidden } = useNavVisibility();
  useEffect(() => {
    setNavHidden(isLoading);
    return () => setNavHidden(false);
  }, [isLoading, setNavHidden]);
}
