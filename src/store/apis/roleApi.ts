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

// Slår den indloggede brugers AKTIVE organisation op (US-59). Samme
// mønster som updateMyOrganisation i organisationApi.ts - roller/
// tildelinger skal altid ske inden for administratorens aktive
// organisation, aldrig i en anden af brugerens organisationer.
async function getActiveOrganisationId(): Promise<{ organisationId: string } | { error: string }> {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
        return { error: 'Du skal være logget ind for at udføre denne handling.' }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_organisation_id')
        .eq('id', userData.user.id)
        .maybeSingle()

    if (profileError) {
        return { error: profileError.message }
    }

    if (!profile?.active_organisation_id) {
        return { error: 'Du er ikke medlem af en organisation.' }
    }

    return { organisationId: profile.active_organisation_id }
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

                const org = await getActiveOrganisationId()
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
        // med rollen mister den (memberships.role_id ... on delete set
        // null) - 'Privilege', 'Profile' og 'Membership' invalideres derfor
        // også.
        deleteRole: builder.mutation<void, string>({
            queryFn: async (roleId) => {
                const { error } = await supabase.from('roles').delete().eq('id', roleId)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Role', 'Privilege', 'Profile', 'Membership'],
        }),

        // Henter medlemmerne af administratorens AKTIVE organisation, så de
        // kan tildeles en rolle (US-11). US-59: medlemskab (og dermed rolle)
        // ligger nu på memberships, ikke profiles - hentes i to kald i
        // stedet for en PostgREST-join (samme mønster som
        // getPendingMembershipRequests i membershipApi.ts), da en enkelt
        // fejlende join ellers ville vælte hele medlemslisten.
        getOrganisationMembers: builder.query<OrganisationMember[], void>({
            queryFn: async () => {
                const org = await getActiveOrganisationId()
                if ('error' in org) {
                    return { error: { status: 'CUSTOM_ERROR', error: org.error } }
                }

                const { data: memberships, error: membershipsError } = await supabase
                    .from('memberships')
                    .select('user_id, role_id')
                    .eq('organisation_id', org.organisationId)

                if (membershipsError) {
                    return { error: { status: 'CUSTOM_ERROR', error: membershipsError.message } }
                }

                if (!memberships || memberships.length === 0) {
                    return { data: [] }
                }

                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .in('id', memberships.map((membership) => membership.user_id))
                    .order('first_name')

                if (profilesError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profilesError.message } }
                }

                const roleIdByUserId = new Map(memberships.map((membership) => [membership.user_id, membership.role_id]))

                return {
                    data: (profiles ?? []).map((profile) => ({
                        id: profile.id,
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        email: profile.email,
                        roleId: roleIdByUserId.get(profile.id) ?? null,
                    })),
                }
            },

            providesTags: ['Role'],
        }),

        // Tildeler en rolle til et medlem af den aktive organisation
        // (US-11), eller fjerner rollen (roleId: null) så medlemmet bliver
        // et almindeligt medlem uden administrative privilegier. US-59:
        // opdaterer nu medlemmets membership-række for netop denne
        // organisation, ikke profiles. Databasens
        // trg_prevent_self_membership_role_change afviser, hvis
        // administratoren forsøger at tildele sig selv en rolle - UI'en
        // undgår desuden at vise kontrollen for administratorens egen række.
        assignRole: builder.mutation<void, AssignRoleInput>({
            queryFn: async ({ userId, roleId }) => {
                const org = await getActiveOrganisationId()
                if ('error' in org) {
                    return { error: { status: 'CUSTOM_ERROR', error: org.error } }
                }

                const { error } = await supabase
                    .from('memberships')
                    .update({ role_id: roleId })
                    .eq('user_id', userId)
                    .eq('organisation_id', org.organisationId)

                if (error) {
                    // 42501 = RLS afviste - fx forsøg på at give en rolle med
                    // admin-privilegiet uden selv at være admin (escalation-guard).
                    if (error.code === '42501') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Du har ikke rettigheder til at tildele denne rolle.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // 'Profile' invalideres, så headerens rollevisning følger med,
            // hvis medlemmet selv har appen åben.
            invalidatesTags: ['Role', 'Profile', 'Membership'],
        }),

        // Fjerner et medlem fra den aktive organisation (US-66). Kører
        // server-side som RPC'en remove_member, som blokerer selv-fjernelse
        // (brug "Forlad organisation" i stedet) og har en escalation-guard:
        // kun en reel administrator må fjerne et andet medlem, hvis rolle
        // bærer admin-privilegiet.
        removeMember: builder.mutation<void, string>({
            queryFn: async (userId) => {
                const { error } = await supabase.rpc('remove_member', { p_user_id: userId })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // Samme bredde som assignRole, så den fjernede brugers evt.
            // åbne session mister adgang uden en manuel genindlæsning.
            invalidatesTags: ['Role', 'Profile', 'Membership'],
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
    useRemoveMemberMutation,
} = roleApi
