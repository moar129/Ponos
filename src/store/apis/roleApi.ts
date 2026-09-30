// src/store/apis/roleApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { AssignRoleInput, CreateRoleInput, CreateRoleWithPrivilegesInput, OrganisationMember, Role, UpdateRoleInput } from '../../types/role/roleType'
import { errorCode, mapDbError, runQuery } from './apiError'
import { getActiveOrganisationId } from './session'
import { fetchProfilesByIds } from './profileApi'

// Navnet på organisationens indbyggede administrator-rolle. Sammen med
// ADMIN_PRIVILEGE (privilegeApi.ts) bruges det til at låse netop denne
// rolle mod omdøb/slet i UI'en - andre roller må frit have
// admin-privilegiet uden at blive låst (jf. databasens
// prevent_admin_role_change-trigger, som bruger samme konvention).
export const ADMIN_ROLE_NAME = 'Admin'

// Navnet på organisationens beskyttede standardrolle (Fase 3) - tildeles
// automatisk ved medlemskab og fungerer som fallback, når en anden rolle
// slettes (se prevent_default_role_change/reassign_members_before_role_delete
// i dbSchema.sql). Bruges her til at låse netop denne rolle mod omdøb/
// slet i UI'en, samme mønster som ADMIN_ROLE_NAME.
export const MEMBER_ROLE_NAME = 'Medlem'

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
                    return { error: mapDbError(error) }
                }

                return { data: data ?? [] }
            },

            providesTags: ['Role'],
        }),

        // Opretter en rolle i administratorens organisation (US-12). RLS
        // ("Admin kan oprette roller i egen organisation") afviser dette
        // server-side for ikke-admins.
        createRole: builder.mutation<Role, CreateRoleInput>({
            queryFn: ({ name }) => runQuery(async () => {
                const trimmed = name.trim()

                if (!trimmed) return { error: errorCode('required.roleName') }

                // Roller oprettes altid i administratorens AKTIVE organisation (US-59).
                const organisationId = await getActiveOrganisationId()

                const { data, error } = await supabase
                    .from('roles')
                    .insert({ organisation_id: organisationId, name: trimmed })
                    .select('id, name')
                    .single()

                // unique (organisation_id, name): rollenavnet findes allerede.
                if (error) return { error: mapDbError(error, { unique: 'duplicateRoleName' }) }
                return { data }
            }),

            invalidatesTags: ['Role'],
        }),

        // Opretter en rolle + dens privilegier atomisk (hurtig-oprettelse
        // fra rum-modalen). RPC'en kræver kun create_roles, men tillader
        // kun privilegier kalderen selv har (eskalerings-guard) - se
        // create_role_with_privileges i dbSchema.sql.
        createRoleWithPrivileges: builder.mutation<Role, CreateRoleWithPrivilegesInput>({
            queryFn: async ({ name, privilegeNames }) => {
                const trimmed = name.trim()

                if (!trimmed) return { error: errorCode('required.roleName') }

                const { data, error } = await supabase.rpc('create_role_with_privileges', {
                    p_name: trimmed,
                    p_privilege_names: privilegeNames,
                })

                if (error) return { error: mapDbError(error, { unique: 'duplicateRoleName' }) }

                const role = (data as Role[] | null)?.[0]
                if (!role) return { error: errorCode('generic') }

                return { data: role }
            },

            invalidatesTags: ['Role', 'Privilege'],
        }),

        // Omdøber en rolle i administratorens organisation. RLS ("Admin
        // kan redigere/slette roller i egen organisation") afviser dette
        // server-side for ikke-admins.
        updateRole: builder.mutation<void, UpdateRoleInput>({
            queryFn: async ({ roleId, name }) => {
                const trimmed = name.trim()

                if (!trimmed) return { error: errorCode('required.roleName') }

                const { error } = await supabase
                    .from('roles')
                    .update({ name: trimmed })
                    .eq('id', roleId)

                if (error) return { error: mapDbError(error, { unique: 'duplicateRoleName' }) }

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
                    return { error: mapDbError(error) }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Role', 'Privilege', 'Profile', 'Membership'],
        }),

        // Henter medlemmerne af administratorens AKTIVE organisation, så de
        // kan tildeles en rolle (US-11), bruges som kontaktliste (US-B1) og
        // som tilmeldingsliste på opgaver. US-59: medlemskab (og dermed
        // rolle) ligger på memberships, ikke profiles. Rollenavn og
        // profilbillede hentes med, så listerne kan vise dem uden et ekstra
        // kald per medlem.
        getOrganisationMembers: builder.query<OrganisationMember[], void>({
            queryFn: () => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()

                const { data: memberships, error: membershipsError } = await supabase
                    .from('memberships')
                    .select('user_id, role_id')
                    .eq('organisation_id', organisationId)

                if (membershipsError) return { error: mapDbError(membershipsError) }
                if (!memberships || memberships.length === 0) return { data: [] }

                const [profileById, { data: roles, error: rolesError }] = await Promise.all([
                    fetchProfilesByIds(memberships.map((m) => m.user_id)),
                    supabase.from('roles').select('id, name').eq('organisation_id', organisationId),
                ])

                if (rolesError) return { error: mapDbError(rolesError) }

                const roleNameById = new Map((roles ?? []).map((r) => [r.id, r.name]))

                const members: OrganisationMember[] = memberships.flatMap((membership) => {
                    const profile = profileById.get(membership.user_id)
                    if (!profile) return []
                    const roleId: string | null = membership.role_id ?? null
                    return [{
                        id: profile.id,
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        email: profile.email,
                        roleId,
                        roleName: roleId ? roleNameById.get(roleId) ?? null : null,
                        urlPicture: profile.url_picture,
                    }]
                })

                return {
                    data: members.sort((a, b) => (a.firstName ?? '').localeCompare(b.firstName ?? '')),
                }
            }),

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
            queryFn: ({ userId, roleId }) => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()

                const { error } = await supabase
                    .from('memberships')
                    .update({ role_id: roleId })
                    .eq('user_id', userId)
                    .eq('organisation_id', organisationId)

                // 42501 = RLS afviste - fx forsøg på at give en rolle med
                // admin-privilegiet uden selv at være admin (escalation-guard).
                if (error) return { error: mapDbError(error, { permission: 'assignRole' }) }
                return { data: undefined }
            }),

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
                    return { error: mapDbError(error) }
                }

                return { data: undefined }
            },

            // Samme bredde som assignRole, så den fjernede brugers evt.
            // åbne session mister adgang uden en manuel genindlæsning.
            invalidatesTags: ['Role', 'Profile', 'Membership'],
        }),

        // Giver admin-rollen videre til et andet medlem (US-11-opfølgning:
        // højst én admin ad gangen). Kører server-side som RPC'en
        // transfer_admin_role, som atomisk sætter modtageren til Admin OG
        // den kaldende admin selv til Medlem - erstatter assignRole for
        // netop dette tilfælde, da en almindelig tildeling ikke kan udføre
        // to medlemskabers rolleskift i én transaktion.
        transferAdminRole: builder.mutation<void, { userId: string }>({
            queryFn: async ({ userId }) => {
                const { error } = await supabase.rpc('transfer_admin_role', { p_new_admin_user_id: userId })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Role', 'Profile', 'Membership'],
        }),
    }),
})

export const {
    useGetOrganisationRolesQuery,
    useCreateRoleMutation,
    useCreateRoleWithPrivilegesMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useGetOrganisationMembersQuery,
    useAssignRoleMutation,
    useRemoveMemberMutation,
    useTransferAdminRoleMutation,
} = roleApi
