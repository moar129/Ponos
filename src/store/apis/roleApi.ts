// src/store/apis/roleApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { AssignRoleInput, CreateRoleInput, OrganisationMember, Role, UpdateRoleInput } from '../../types/role/roleType'

// Navnet på organisationens indbyggede administrator-rolle. Sammen med
// ADMIN_PRIVILEGE (privilegeApi.ts) bruges det til at låse netop denne
// rolle mod omdøb/slet i UI'en - andre roller må frit have
// admin-privilegiet uden at blive låst (jf. databasens
// prevent_admin_role_change-trigger, som bruger samme konvention).
export const ADMIN_ROLE_NAME = 'Admin'

// Slår den indloggede brugers organisation op. Samme mønster som
// updateMyOrganisation i organisationApi.ts - roller/tildelinger skal
// altid ske inden for administratorens egen organisation.
async function getMyOrganisationId(): Promise<{ organisationId: string } | { error: string }> {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
        return { error: 'Du skal være logget ind for at udføre denne handling.' }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organisation_id')
        .eq('id', userData.user.id)
        .maybeSingle()

    if (profileError) {
        return { error: profileError.message }
    }

    if (!profile?.organisation_id) {
        return { error: 'Du er ikke medlem af en organisation.' }
    }

    return { organisationId: profile.organisation_id }
}

export const roleApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter organisationens roller (US-11 + US-12). RLS ("Se roller i
        // egen organisation") afgrænser allerede til egen organisation.
        getOrganisationRoles: builder.query<Role[], void>({
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('roles')
                    .select('id, name')
                    .order('name')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: data ?? [] }
            },

            providesTags: ['Role'],
        }),

        // Opretter en rolle i administratorens organisation (US-12). RLS
        // ("Admin kan oprette roller i egen organisation") afviser dette
        // server-side for ikke-admins.
        createRole: builder.mutation<Role, CreateRoleInput>({
            queryFn: async ({ name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Rollens navn skal udfyldes.' } }
                }

                const org = await getMyOrganisationId()
                if ('error' in org) {
                    return { error: { status: 'CUSTOM_ERROR', error: org.error } }
                }

                const { data, error } = await supabase
                    .from('roles')
                    .insert({ organisation_id: org.organisationId, name: trimmed })
                    .select('id, name')
                    .single()

                if (error) {
                    // Postgres-fejlkode 23505 = unique constraint violation
                    // (organisation_id, name) - der findes allerede en rolle
                    // med dette navn i organisationen.
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Der findes allerede en rolle med dette navn.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data }
            },

            invalidatesTags: ['Role'],
        }),

        // Omdøber en rolle i administratorens organisation. RLS ("Admin
        // kan redigere/slette roller i egen organisation") afviser dette
        // server-side for ikke-admins.
        updateRole: builder.mutation<void, UpdateRoleInput>({
            queryFn: async ({ roleId, name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Rollens navn skal udfyldes.' } }
                }

                const { error } = await supabase
                    .from('roles')
                    .update({ name: trimmed })
                    .eq('id', roleId)

                if (error) {
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Der findes allerede en rolle med dette navn.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Role'],
        }),

        // Sletter en rolle i administratorens organisation. RLS ("Admin kan
        // slette roller i egen organisation") afviser dette server-side for
        // ikke-admins. Databasen kaskaderer selv: tilknyttede privileges
        // slettes (privileges.role_id ... on delete cascade), og medlemmer
        // med rollen mister den (profiles.role_id ... on delete set null) -
        // 'Privilege' og 'Profile' invalideres derfor også.
        deleteRole: builder.mutation<void, string>({
            queryFn: async (roleId) => {
                const { error } = await supabase.from('roles').delete().eq('id', roleId)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Role', 'Privilege', 'Profile'],
        }),

        // Henter medlemmerne af administratorens organisation, så de kan
        // tildeles en rolle (US-11). RLS ("Se egen profil eller profiler i
        // egen organisation") afgrænser allerede til egen organisation.
        getOrganisationMembers: builder.query<OrganisationMember[], void>({
            queryFn: async () => {
                const org = await getMyOrganisationId()
                if ('error' in org) {
                    return { error: { status: 'CUSTOM_ERROR', error: org.error } }
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, role_id')
                    .eq('organisation_id', org.organisationId)
                    .order('first_name')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return {
                    data: (data ?? []).map((profile) => ({
                        id: profile.id,
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        email: profile.email,
                        roleId: profile.role_id,
                    })),
                }
            },

            providesTags: ['Role'],
        }),

        // Tildeler en rolle til et medlem af organisationen (US-11).
        // Databasens trg_prevent_self_role_org_change afviser, hvis
        // administratoren forsøger at tildele sig selv en rolle - UI'en
        // undgår desuden at vise kontrollen for administratorens egen række.
        assignRole: builder.mutation<void, AssignRoleInput>({
            queryFn: async ({ userId, roleId }) => {
                const { error } = await supabase
                    .from('profiles')
                    .update({ role_id: roleId })
                    .eq('id', userId)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // 'Profile' invalideres, så headerens rollevisning følger med,
            // hvis medlemmet selv har appen åben.
            invalidatesTags: ['Role', 'Profile'],
        }),
    }),
})

export const {
    useGetOrganisationRolesQuery,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useGetOrganisationMembersQuery,
    useAssignRoleMutation,
} = roleApi
