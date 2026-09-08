// src/store/apis/organisationApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

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
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // Får getMyOrganisation til at hente frisk data, så det
            // opdaterede navn vises umiddelbart efter en succesfuld gemning.
            invalidatesTags: ['Organisation'],
        }),
    }),
})

export const { useGetMyOrganisationQuery, useUpdateMyOrganisationMutation } = organisationApi
