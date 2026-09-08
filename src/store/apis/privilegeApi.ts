// src/store/apis/privilegeApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'

// Navnet på det privilegie, der giver adgang til organisations-
// administration (medlemmer, roller, privilegier). Konventionen er sat i
// databasen, hvor RLS-policies bruger has_privilege('admin').
export const ADMIN_PRIVILEGE = 'admin'

export const privilegeApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter navnene på den indloggede brugers privilegier (via rollen).
        // Bruges KUN til at vise/skjule UI - den reelle adgangskontrol
        // ligger i RLS, som ikke kan omgås fra klienten.
        getMyPrivileges: builder.query<string[], void>({
            queryFn: async () => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    // Ingen session er ikke en fejl - så har man ingen
                    // privilegier at vise UI efter.
                    if (userError.name === 'AuthSessionMissingError') {
                        return { data: [] }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: userError.message } }
                }

                if (!userData.user) {
                    return { data: [] }
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                // Uden rolle (fx nyoprettet bruger uden organisation) er
                // der ingen privilegier - og intet ekstra opslag at lave.
                if (!profile?.role_id) {
                    return { data: [] }
                }

                const { data, error } = await supabase
                    .from('privileges')
                    .select('name')
                    .eq('role_id', profile.role_id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: (data ?? []).map((privilege) => privilege.name) }
            },

            providesTags: ['Privilege'],
        }),
    }),
})

export const { useGetMyPrivilegesQuery } = privilegeApi

// Lille hjælper, så komponenter ikke skal gentage sammenligningen.
// isLoading returneres med, så UI'en kan undlade at vise "ingen adgang",
// før svaret rent faktisk er hentet.
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
    const { data: privileges, isLoading } = useGetMyPrivilegesQuery()

    return {
        isAdmin: privileges?.includes(ADMIN_PRIVILEGE) ?? false,
        isLoading,
    }
}
