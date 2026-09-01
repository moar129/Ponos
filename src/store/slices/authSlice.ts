import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Session } from '@supabase/supabase-js'
import type { AuthState } from '../../types/auth/authType'

// Initial state for the auth slice
const initialState: AuthState = {
    session: null,
    // 'loading' som udgangspunkt: vi ved endnu ikke om der findes en
    // gemt session, før vi har spurgt Supabase
    status: 'loading',
}
// Opretter authSlice med initial state og reducers
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Kaldes når Supabase fortæller os der ER en aktiv session
        // (fx ved login, eller når appen starter og finder en gemt session)
        sessionLoaded(state, action: PayloadAction<Session | null>) {
            state.session = action.payload
            state.status = action.payload ? 'authenticated' : 'unauthenticated'
        },
        // Kaldes eksplicit ved logout, for at rydde state med det samme
        sessionCleared(state) {
            state.session = null
            state.status = 'unauthenticated'
        },
    },
})

export const { sessionLoaded, sessionCleared } = authSlice.actions
export default authSlice.reducer