import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type ThemeMode = 'light' | 'dark';

type ThemePreference = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = '@to-aqui/theme-mode';
const ThemePreferenceContext = createContext<ThemePreference>({
  mode: 'light',
  setMode: () => {},
});

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  // Claro é o padrão deliberado do design system, independentemente do sistema.
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((salvo) => {
      if (salvo === 'light' || salvo === 'dark') setModeState(salvo);
    });
  }, []);

  const value = useMemo<ThemePreference>(
    () => ({
      mode,
      setMode: (novoModo) => {
        setModeState(novoModo);
        AsyncStorage.setItem(STORAGE_KEY, novoModo);
      },
    }),
    [mode]
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
