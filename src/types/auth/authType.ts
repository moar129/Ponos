import type { Session } from '@supabase/supabase-js'

export interface AuthState {
    session: Session | null
    status: 'loading' | 'authenticated' | 'unauthenticated'
}