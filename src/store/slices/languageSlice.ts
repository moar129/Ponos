import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '../../i18n/languages';

export const LANGUAGE_STORAGE_KEY = 'ponos-language';

// Samme mønster som themeSlice: pre-hydration-scriptet i index.html har
// allerede afgjort sproget før React monterer og skrevet det på
// <html lang>, så vi læser det derfra i stedet for at gentage
// localStorage/navigator-logikken.
function getInitialLanguage(): string {
  const fromDocument = document.documentElement.lang;
  return isSupportedLanguage(fromDocument) ? fromDocument : DEFAULT_LANGUAGE;
}

const languageSlice = createSlice({
  name: 'language',
  initialState: { code: getInitialLanguage() } as { code: string },
  reducers: {
    setLanguage(state, action: PayloadAction<string>) {
      // Ukendte koder ignoreres, så en gammel localStorage-værdi eller et
      // fjernet sprog ikke kan efterlade appen uden ordbog.
      if (isSupportedLanguage(action.payload)) {
        state.code = action.payload;
      }
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export const languageReducer = languageSlice.reducer;
