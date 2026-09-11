// src/store/apis/organisationApi.ts
import { supabaseApi, USER_SCOPED_TAGS } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreateOrganisationInput, MyMembership, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

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
            // så resten af UI'en (header, /bruger, dashboardets Organisation-
            // fane) opdaterer sig selv uden reload.
            invalidatesTags: ['Organisation', 'Profile', 'Privilege', 'Membership'],
        }),

        // Henter alle organisationer brugeren er medlem af (US-59), til
        // listen "Mine organisationer" på /organisation. isActive markerer
        // hvilken der p.t. er aktiv organisation. Kører server-side som
        // RPC'en get_my_memberships (security definer) i stedet for
        // separate klient-forespørgsler: roles-tabellens RLS ("Se roller i
        // egen organisation") er scopet til brugerens AKTIVE organisation,
        // så et almindeligt klient-opslag kunne ikke se rollenavnet for en
        // organisation, der ikke lige er aktiv - viste fejlagtigt "Ingen
        // rolle tildelt" for dem. RPC'en omgår det ved at læse alt i én
        // atomisk, uden RLS-begrænsning på selve opslaget.
        getMyMemberships: builder.query<MyMembership[], void>({
            queryFn: async () => {
                const { data, error } = await supabase.rpc('get_my_memberships')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                type MyMembershipRow = {
                    organisation_id: string
                    organisation_name: string
                    role_id: string | null
                    role_name: string | null
                    is_active: boolean
                    is_admin: boolean
                    member_count: number
                }

                return {
                    data: ((data ?? []) as MyMembershipRow[]).map((row) => ({
                        organisationId: row.organisation_id,
                        organisationName: row.organisation_name,
                        roleName: row.role_name,
                        isActive: row.is_active,
                        isAdmin: row.is_admin,
                        memberCount: row.member_count,
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

            invalidatesTags: [...USER_SCOPED_TAGS],
        }),

        // Forlader en organisation (US-61). Kører server-side som RPC'en
        // leave_organisation, som blokerer hvis brugeren er organisationens
        // eneste administrator, og - hvis den forladte organisation var
        // aktiv - automatisk vælger en anden af brugerens resterende
        // medlemskaber som ny aktiv organisation (samme "automatisk skift"-
        // mønster som ved oprettelse, US-60). Returnerer den nye aktive
        // organisation (eller null, hvis brugeren ikke har flere
        // medlemskaber tilbage), så UI'en kan vise hvilken organisation
        // brugeren nu er på.
        leaveOrganisation: builder.mutation<Organisation | null, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                const { data, error } = await supabase.rpc('leave_organisation', {
                    p_organisation_id: organisationId,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: data ? { id: data.id, name: data.name } : null }
            },

            invalidatesTags: [...USER_SCOPED_TAGS],
        }),

        // Sletter en organisation permanent (US-64). Kører server-side som
        // RPC'en delete_organisation, som kun tillader det for en reel
        // administrator af DEN organisation (ikke nødvendigvis brugerens
        // aktive) - ingen "sidste medlem"-restriktion, dækker både "alene
        // tilbage" og "organisationen lukker ned med andre medlemmer
        // tilbage". Alt underliggende data (opgaver, items, kategorier,
        // lokationer, statistik, roller, medlemskaber) cascader automatisk
        // via eksisterende FK'er. Returnerer den slettende brugers nye
        // aktive organisation (eller null), udfyldt kun hvis den slettede
        // org var brugerens egen aktive - samme mønster som
        // leaveOrganisation.
        deleteOrganisation: builder.mutation<Organisation | null, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                const { data, error } = await supabase.rpc('delete_organisation', {
                    p_organisation_id: organisationId,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: data ? { id: data.id, name: data.name } : null }
            },

            invalidatesTags: [...USER_SCOPED_TAGS],
        }),
    }),
})

export const {
    useGetMyOrganisationQuery,
    useUpdateMyOrganisationMutation,
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useSetActiveOrganisationMutation,
    useLeaveOrganisationMutation,
    useDeleteOrganisationMutation,
} = organisationApi
