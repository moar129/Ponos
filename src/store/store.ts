import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import membershipReducer from './slices/membershipSlice';
import categoryReducer from './slices/categorySlice';
import { taskReducer } from './slices/taskSlices';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    membership: membershipReducer,
    categories: categoryReducer,
    task: taskReducer,
    // tilføj flere efter behov
  },
});

// Typer til brug i resten af appen
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;