// src/store/apis/privilegeApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreatePrivilegeInput, Privilege, UpdatePrivilegeInput } from '../../types/role/roleType'

// Navnet på det privilegie, der giver adgang til ALT (superset af alle
// andre privilegier). Konventionen er sat i databasen, hvor RLS-policies
// bruger has_privilege_or_admin(), som altid tillader admin.
export const ADMIN_PRIVILEGE = 'admin'

// Granulære privilegienavne (Fase 1) - matcher navnene RLS-policies
// tjekker via has_privilege_or_admin() i dbSchema.sql.
export const MANAGE_ROLES_PRIVILEGE = 'manage_roles'
export const MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE = 'manage_membership_requests'
export const MANAGE_ORGANISATION_PRIVILEGE = 'manage_organisation'

// Kendte systemprivilegier med brugervenlige, danske labels - bruges til
// at vise en dropdown i stedet for et fritekstfelt, når man tilføjer et
// privilegie til en rolle. En organisation kan ikke forventes at kende
// eller stave de bogstavelige privilegienavne, RLS-policies tjekker.
// Privileges-tabellen tillader stadig vilkårlige navne (US-13 er skrevet
// generisk), så UI'en har også en "Andet"-mulighed med fritekst.
export const KNOWN_PRIVILEGES: { name: string; label: string }[] = [
    { name: ADMIN_PRIVILEGE, label: 'Fuld administrator (kan alt)' },
    { name: MANAGE_ROLES_PRIVILEGE, label: 'Administrere roller og privilegier' },
    { name: MANAGE_MEMBERSHIP_REQUESTS_PRIVILEGE, label: 'Behandle medlemsanmodninger' },
    { name: MANAGE_ORGANISATION_PRIVILEGE, label: 'Redigere organisation' },
]

// Slår et privilegienavn op i KNOWN_PRIVILEGES og returnerer dets
// brugervenlige label - falder tilbage til det rå navn for
// custom-privilegier, der ikke er i listen.
export function privilegeLabel(name: string): string {
    return KNOWN_PRIVILEGES.find((p) => p.name === name)?.label ?? name
}

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
                    .select('active_organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                // Uden aktiv organisation (fx nyoprettet bruger) er der
                // ingen privilegier - og intet ekstra opslag at lave.
                if (!profile?.active_organisation_id) {
                    return { data: [] }
                }

                // Rollen ligger på memberships (US-59) - brugerens rolle i
                // DEN AKTIVE organisation, ikke nødvendigvis i alle sine
                // organisationer.
                const { data: membership, error: membershipError } = await supabase
                    .from('memberships')
                    .select('role_id')
                    .eq('user_id', userData.user.id)
                    .eq('organisation_id', profile.active_organisation_id)
                    .maybeSingle()

                if (membershipError) {
                    return { error: { status: 'CUSTOM_ERROR', error: membershipError.message } }
                }

                if (!membership?.role_id) {
                    return { data: [] }
                }

                const { data, error } = await supabase
                    .from('privileges')
                    .select('name')
                    .eq('role_id', membership.role_id)

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
                            error: { status: 'CUSTOM_ERROR', error: 'Rollen har allerede dette privilegie.' },
                        }
                    }
                    // 42501 = RLS afviste - fx forsøg på at oprette et
                    // privilegie ved navn "admin" uden selv at være admin.
                    if (error.code === '42501') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Du har ikke rettigheder til at oprette dette privilegie.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: { id: data.id, roleId: data.role_id, name: data.name } }
            },

            invalidatesTags: ['Privilege'],
        }),

        // Omdøber et privilege. RLS ("Admin kan redigere/slette
        // privilegier i egen organisation") afviser dette server-side for
        // ikke-admins og for privilegier uden for egen organisation.
        updatePrivilege: builder.mutation<void, UpdatePrivilegeInput>({
            queryFn: async ({ privilegeId, name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Privilegiets navn skal udfyldes.' } }
                }

                const { error } = await supabase
                    .from('privileges')
                    .update({ name: trimmed })
                    .eq('id', privilegeId)

                if (error) {
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Rollen har allerede dette privilegie.' },
                        }
                    }
                    // 42501 = RLS afviste - fx forsøg på at omdøbe et
                    // privilegie til "admin" uden selv at være admin.
                    if (error.code === '42501') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Du har ikke rettigheder til at redigere dette privilegie.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Privilege'],
        }),

        // Fjerner et privilege fra en rolle. RLS ("Admin kan slette
        // privilegier i egen organisation") afviser dette server-side for
        // ikke-admins og for privilegier uden for egen organisation.
        deletePrivilege: builder.mutation<void, string>({
            queryFn: async (privilegeId) => {
                const { error } = await supabase.from('privileges').delete().eq('id', privilegeId)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Privilege'],
        }),
    }),
})

export const {
    useGetMyPrivilegesQuery,
    useGetOrganisationPrivilegesQuery,
    useCreatePrivilegeMutation,
    useUpdatePrivilegeMutation,
    useDeletePrivilegeMutation,
} = privilegeApi

// Generisk hjælper til at gate UI efter et enkelt privilegie. Admin har
// altid alt (samme regel som has_privilege_or_admin() i databasen).
// isLoading returneres med, så UI'en kan undlade at vise "ingen adgang",
// før svaret rent faktisk er hentet.
export function useHasPrivilege(name: string): { hasPrivilege: boolean; isLoading: boolean } {
    const { data: privileges, isLoading } = useGetMyPrivilegesQuery()

    return {
        hasPrivilege: (privileges?.includes(name) || privileges?.includes(ADMIN_PRIVILEGE)) ?? false,
        isLoading,
    }
}
