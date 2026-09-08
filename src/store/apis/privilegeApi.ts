// src/store/apis/privilegeApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreatePrivilegeInput, Privilege } from '../../types/role/roleType'

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

        // Henter privilegierne for organisationens roller (US-13). RLS
        // ("Se privilegier i egen organisation") afgrænser allerede til
        // roller i egen organisation.
        getOrganisationPrivileges: builder.query<Privilege[], void>({
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('privileges')
                    .select('id, role_id, name')
                    .order('name')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return {
                    data: (data ?? []).map((privilege) => ({
                        id: privilege.id,
                        roleId: privilege.role_id,
                        name: privilege.name,
                    })),
                }
            },

            providesTags: ['Privilege'],
        }),

        // Tilknytter et privilege til en rolle (US-13). RLS ("Admin kan
        // oprette privilegier i egen organisation") afviser dette
        // server-side for ikke-admins og for roller uden for egen
        // organisation.
        createPrivilege: builder.mutation<Privilege, CreatePrivilegeInput>({
            queryFn: async ({ roleId, name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Privilegiets navn skal udfyldes.' } }
                }

                const { data, error } = await supabase
                    .from('privileges')
                    .insert({ role_id: roleId, name: trimmed })
                    .select('id, role_id, name')
                    .single()

                if (error) {
                    // Postgres-fejlkode 23505 = unique constraint violation
                    // (role_id, name) - rollen har allerede dette privilege.
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Rollen har allerede dette privilege.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: { id: data.id, roleId: data.role_id, name: data.name } }
            },

            invalidatesTags: ['Privilege'],
        }),
    }),
})

export const {
    useGetMyPrivilegesQuery,
    useGetOrganisationPrivilegesQuery,
    useCreatePrivilegeMutation,
} = privilegeApi

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
