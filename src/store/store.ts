import { configureStore } from '@reduxjs/toolkit';
import { supabaseApi } from './apis/supabaseApi';
import { themeReducer } from './slices/themeSlice';
import { languageReducer } from './slices/languageSlice';

export const store = configureStore({
  reducer: {
    // RTK Query reducer til Supabase API
    [supabaseApi.reducerPath]: supabaseApi.reducer,
    theme: themeReducer,
    language: languageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(supabaseApi.middleware),
});

// Typer til brug i resten af appen
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;