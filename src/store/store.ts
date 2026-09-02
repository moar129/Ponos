import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import membershipReducer from './slices/membershipSlice';
import { taskReducer } from './slices/taskSlices';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        membership: membershipReducer,
        task: taskReducer,
    },
});

// Typer til brug i resten af appen (giver TypeScript-autocomplete
// på state og dispatch, når vi bruger useSelector/useDispatch)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;