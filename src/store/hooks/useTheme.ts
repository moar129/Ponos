import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { toggleTheme as toggleThemeAction, THEME_STORAGE_KEY } from '../slices/themeSlice';

export function useTheme() {
  const mode = useAppSelector((state) => state.theme.mode);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  return { mode, toggleTheme: () => dispatch(toggleThemeAction()) };
}
