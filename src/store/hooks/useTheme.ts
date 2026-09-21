import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import {
  toggleTheme as toggleThemeAction,
  setTheme as setThemeAction,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '../slices/themeSlice';

export function useTheme() {
  const mode = useAppSelector((state) => state.theme.mode);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // toggleTheme til headerens enkelte knap; setTheme til profilsidens
  // Lys/Mørk-valg, hvor begge tilstande skal kunne vælges direkte.
  return {
    mode,
    toggleTheme: () => dispatch(toggleThemeAction()),
    setTheme: (next: ThemeMode) => dispatch(setThemeAction(next)),
  };
}
