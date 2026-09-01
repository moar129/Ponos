import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        // Tilføj redux-reducerne her, når vi får brug for dem. For nu er der ingen.
    },
});

// Typer til brug i resten af appen (giver TypeScript-autocomplete
// på state og dispatch, når vi bruger useSelector/useDispatch)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;