import { configureStore } from '@reduxjs/toolkit';
import categoryReducer from './slices/categorySlice';
import { taskReducer } from './slices/taskSlices';
import { supabaseApi } from './apis/supabaseApi';

export const store = configureStore({
  reducer: {
    categories: categoryReducer,
    task: taskReducer,
    // RTK Query reducer til Supabase API
    [supabaseApi.reducerPath]: supabaseApi.reducer,
    // tilføj flere efter behov
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(supabaseApi.middleware),
});

// Typer til brug i resten af appen
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;