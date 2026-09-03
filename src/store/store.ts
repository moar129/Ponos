import { configureStore } from '@reduxjs/toolkit';
import { taskReducer } from './slices/taskSlices';
import { supabaseApi } from './apis/supabaseApi';

export const store = configureStore({
  reducer: {
    task: taskReducer,
    // RTK Query reducer til Supabase API
    [supabaseApi.reducerPath]: supabaseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(supabaseApi.middleware),
});

// Typer til brug i resten af appen
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;