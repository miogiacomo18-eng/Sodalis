import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors, dark, light } from '../constants/tokens';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  c: Colors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  c: dark, isDark: true, mode: 'system',
  setMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() ?? 'dark'; // 'light' | 'dark'
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Carica preferenza dell'utente dal DB al login
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('theme')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme && ['light', 'dark', 'system'].includes(data.theme)) {
          setModeState(data.theme as ThemeMode);
        }
      });
  }, [user?.id]);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    if (user) {
      await supabase.from('profiles').update({ theme: newMode }).eq('id', user.id);
    }
  }, [user]);

  const isDark = useMemo(() => {
    if (mode === 'system') return system === 'dark';
    return mode === 'dark';
  }, [mode, system]);

  const c = isDark ? dark : light;

  return (
    <ThemeContext.Provider value={{ c, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
