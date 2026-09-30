import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getDocumentLanguage, isSupportedLanguage } from '../../i18n/languages';

export const LANGUAGE_STORAGE_KEY = 'ponos-language';

const languageSlice = createSlice({
  name: 'language',
  initialState: { code: getDocumentLanguage() } as { code: string },
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
