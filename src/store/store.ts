import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import membershipReducer from './slices/membershipSlice';
import categoryReducer from './slices/categorySlice';
import { taskReducer } from './slices/taskSlices';
import { supabaseApi } from './apis/supabaseApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    membership: membershipReducer,
    categories: categoryReducer,
    task: taskReducer,
    [supabaseApi.reducerPath]: supabaseApi.reducer,
    //[supabaseApi.reducerPath]: supabaseApi.reducer — vi bruger reducerPath 
    // (dvs. strengen 'supabaseApi', som vi satte i sidste trin) som computed key,
    // i stedet for at skrive 'supabaseApi' direkte. Det er konventionen med RTK Query, 
    // så nøglen aldrig kan komme ud af sync med det, API-slicen selv forventer.


    // tilføj flere efter behov
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(supabaseApi.middleware),
});

// Typer til brug i resten af appen
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;