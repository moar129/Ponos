import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
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

// Gør refetchOnFocus/refetchOnReconnect mulige. Opt-in: påvirker kun de
// queries, der selv beder om det (fx statistikken, som ellers ikke ser
// andre brugeres ændringer, mens siden står åben).
setupListeners(store.dispatch);

// Typer til brug i resten af appen
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;