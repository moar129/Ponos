// src/store/apis/organisationApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreateOrganisationInput, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

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
                    .select('organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                if (!profile?.organisation_id) {
                    return { data: null }
                }

                const { data, error } = await supabase
                    .from('organisations')
                    .select('id, name')
                    .eq('id', profile.organisation_id)
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
                    .select('organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (profileError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profileError.message } }
                }

                if (!profile?.organisation_id) {
                    return {
                        error: { status: 'CUSTOM_ERROR', error: 'Du er ikke medlem af en organisation.' },
                    }
                }

                const { error } = await supabase
                    .from('organisations')
                    .update({ name })
                    .eq('id', profile.organisation_id)

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

            // Organisation (den nye org), Profile (organisation_id/role_id
            // ændret) og Privilege (brugeren har nu admin-privilegiet) skal
            // alle hentes friske, så resten af UI'en (header, /bruger,
            // /organisation) opdaterer sig selv uden reload.
            invalidatesTags: ['Organisation', 'Profile', 'Privilege'],
        }),
    }),
})

export const {
    useGetMyOrganisationQuery,
    useUpdateMyOrganisationMutation,
    useCreateOrganisationMutation,
} = organisationApi
