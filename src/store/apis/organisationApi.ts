// src/store/apis/organisationApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreateOrganisationInput, MyMembership, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

// Alle org-scopede tags skal invalideres, når brugeren skifter aktiv
// organisation - præcis samme liste som authApi.ts's login/logout-
// invalidering, plus datalag/opgave-tags (skiftet ændrer hvilken
// organisations data der vises alle steder i appen).
const ACTIVE_ORG_SCOPED_TAGS = [
    'Profile',
    'Privilege',
    'Organisation',
    'Role',
    'Membership',
    'MembershipRequest',
    'PendingRequest',
    'Category',
    'Item',
    'ItemLocation',
    'Task',
    'TaskRoom',
    'MyTasks',
] as const

export const organisationApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter den indloggede brugers egen organisation. Slår først
        // organisation_id op på egen profil (samme mønster som
        // updateMyOrganisation) og henter derefter organisationen med et
        // eksplicit .eq() filter - et ufiltreret select afhænger alene af
        // RLS til at afgrænse til 0/1 række, hvilket i praksis lækker
        // Postgrests PGRST116-fejl igennem i 0-rækker-tilfældet (bruger uden
        // organisation) i stedet for stille at give null.
        getMyOrganisation: builder.query<Organisation | null, void>({
            queryFn: async () => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    if (userError.name === 'AuthSessionMissingError') {
                        return { data: null }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: userError.message } }
                }

                if (!userData.user) {
                    return { data: null }
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('active_organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                if (!profile?.active_organisation_id) {
                    return { data: null }
                }

                const { data, error } = await supabase
                    .from('organisations')
                    .select('id, name')
                    .eq('id', profile.active_organisation_id)
                    .maybeSingle()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                if (!data) {
                    return { data: null }
                }

                return { data: { id: data.id, name: data.name } }
            },

            providesTags: ['Organisation'],
        }),

        // Opdaterer organisationens navn. RLS ('Admin kan redigere egen
        // organisation') afviser dette server-side for ikke-admins - profil-
        // opslaget herunder er ikke for adgangskontrol, men for at finde
        // organisationens id (organisations-tabellen peger ikke selv tilbage
        // på brugeren) og for at kunne give en tydelig fejl, hvis brugeren
        // slet ikke er medlem af en organisation.
        updateMyOrganisation: builder.mutation<void, UpdateOrganisationInput>({
            queryFn: async ({ name }) => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError || !userData.user) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: 'Du skal være logget ind for at redigere organisationen.',
                        },
                    }
                }

                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('active_organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                if (!profile?.active_organisation_id) {
                    return {
                        error: { status: 'CUSTOM_ERROR', error: 'Du er ikke medlem af en organisation.' },
                    }
                }

                const { error } = await supabase
                    .from('organisations')
                    .update({ name })
                    .eq('id', profile.active_organisation_id)

                if (error) {
                    // Postgres-fejlkode 23505 = unique constraint violation
                    // (organisations_name_unique) - der findes allerede en
                    // organisation med dette navn.
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Organisationsnavnet er allerede taget - vælg venligst et andet navn.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // Får getMyOrganisation til at hente frisk data, så det
            // opdaterede navn vises umiddelbart efter en succesfuld gemning.
            invalidatesTags: ['Organisation'],
        }),

        // Opretter en ny organisation og tildeler den kaldende bruger
        // rollen Admin (US-58). Kører server-side som en atomisk
        // 'security definer'-funktion (create_organisation), fordi
        // client-side inserts ikke kan udføre det: roles-tabellens RLS
        // kræver allerede at være admin i orgen, og trg_prevent_self_role_
        // org_change blokerer altid brugerens eget forsøg på at sætte sin
        // egen organisation_id/role_id. Funktionen validerer og fejler
        // atomisk, så organisationen aldrig oprettes delvist.
        createOrganisation: builder.mutation<Organisation, CreateOrganisationInput>({
            queryFn: async ({ name }) => {
                const trimmed = name.trim()

                if (!trimmed) {
                    return {
                        error: { status: 'CUSTOM_ERROR', error: 'Organisationens navn skal udfyldes.' },
                    }
                }

                const { data, error } = await supabase.rpc('create_organisation', { p_name: trimmed })

                if (error) {
                    // Postgres-fejlkode 23505 = unique constraint violation
                    // (organisations_name_unique) - der findes allerede en
                    // organisation med dette navn.
                    if (error.code === '23505') {
                        return {
                            error: { status: 'CUSTOM_ERROR', error: 'Organisationsnavnet er allerede taget - vælg venligst et andet navn.' },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: { id: data.id, name: data.name } }
            },

            // Organisation (den nye org), Profile (active_organisation_id
            // ændret), Privilege (brugeren har nu admin-privilegiet) og
            // Membership (nyt medlemskab oprettet) skal alle hentes friske,
            // så resten af UI'en (header, /bruger, /organisation) opdaterer
            // sig selv uden reload.
            invalidatesTags: ['Organisation', 'Profile', 'Privilege', 'Membership'],
        }),

        // Henter alle organisationer brugeren er medlem af (US-59), til
        // listen "Mine organisationer" på /organisation. isActive markerer
        // hvilken der p.t. er aktiv organisation.
        getMyMemberships: builder.query<MyMembership[], void>({
            queryFn: async () => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError) {
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

                const { data: memberships, error: membershipsError } = await supabase
                    .from('memberships')
                    .select('organisation_id, role_id')
                    .eq('user_id', userData.user.id)

                if (membershipsError) {
                    return { error: { status: 'CUSTOM_ERROR', error: membershipsError.message } }
                }

                if (!memberships || memberships.length === 0) {
                    return { data: [] }
                }

                // Organisations-/rollenavne hentes hver for sig i stedet for
                // som PostgREST-joins - samme grund som lookupName i
                // profileApi.ts: en enkelt fejlende join ville ellers vælte
                // hele listen.
                const [organisationsResult, rolesResult] = await Promise.all([
                    supabase
                        .from('organisations')
                        .select('id, name')
                        .in('id', memberships.map((m) => m.organisation_id)),
                    supabase
                        .from('roles')
                        .select('id, name')
                        .in('id', memberships.flatMap((m) => (m.role_id ? [m.role_id] : []))),
                ])

                if (organisationsResult.error) {
                    return { error: { status: 'CUSTOM_ERROR', error: organisationsResult.error.message } }
                }
                if (rolesResult.error) {
                    return { error: { status: 'CUSTOM_ERROR', error: rolesResult.error.message } }
                }

                const organisationNameById = new Map((organisationsResult.data ?? []).map((org) => [org.id, org.name]))
                const roleNameById = new Map((rolesResult.data ?? []).map((role) => [role.id, role.name]))

                return {
                    data: memberships.map((membership) => ({
                        organisationId: membership.organisation_id,
                        organisationName: organisationNameById.get(membership.organisation_id) ?? '',
                        roleName: membership.role_id ? roleNameById.get(membership.role_id) ?? null : null,
                        isActive: membership.organisation_id === profile?.active_organisation_id,
                    })),
                }
            },

            providesTags: ['Membership'],
        }),

        // Skifter brugerens aktive organisation (US-59). Kører server-side
        // som RPC'en set_active_organisation, som validerer at brugeren
        // faktisk er medlem, før profiles.active_organisation_id ændres -
        // klienten opdaterer aldrig den kolonne direkte.
        setActiveOrganisation: builder.mutation<void, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                const { error } = await supabase.rpc('set_active_organisation', {
                    p_organisation_id: organisationId,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: [...ACTIVE_ORG_SCOPED_TAGS],
        }),
    }),
})

export const {
    useGetMyOrganisationQuery,
    useUpdateMyOrganisationMutation,
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useSetActiveOrganisationMutation,
} = organisationApi
