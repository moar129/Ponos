import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { setLanguage as setLanguageAction, LANGUAGE_STORAGE_KEY } from '../slices/languageSlice';
import i18n, { loadLanguage } from '../../i18n/config';

export function useLanguage() {
  const code = useAppSelector((state) => state.language.code);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.documentElement.lang = code;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);

    // Ordbogen hentes før skiftet, så komponenterne ikke rendrer én gang
    // med fallback-sproget og derefter igen med det rigtige. Dansk er
    // bundtet statisk, så det kald returnerer med det samme.
    let cancelled = false;
    void loadLanguage(code).then(() => {
      if (!cancelled) i18n.changeLanguage(code);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return { language: code, setLanguage: (next: string) => dispatch(setLanguageAction(next)) };
}
