// src/store/apis/profileApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { Profile, UpdateProfileInput } from '../../types/profile/profileType'

// Slår et navn op i en tabel ud fra id. Bruges til rolle/organisation,
// som hentes hver for sig i stedet for som PostgREST-joins: joins fejler
// eller returnerer forskellige former afhængigt af FK-opsætningen, og en
// enkelt fejlende join ville ellers vælte hele profilhentningen.
async function lookupName(table: 'roles' | 'organisations', id: string | null): Promise<string | null> {
    if (!id) return null

    const { data, error } = await supabase.from(table).select('name').eq('id', id).maybeSingle()

    if (error || !data) return null
    return data.name
}

export const profileApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // henter den indloggede brugers egen profil. RLS sørger for,
        // at man aldrig kan læse andres profil end sin egen (eller nogen i
        // egen organisation) - .eq('id', ...) her er kun for at ramme
        // netop min egen række.
        getMyProfile: builder.query<Profile | null, void>({
            queryFn: async () => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    // Ingen session (fx lige efter logout) er ikke en fejl -
                    // så findes der bare ingen profil at vise.
                    if (userError.name === 'AuthSessionMissingError') {
                        return { data: null }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: userError.message } }
                }

                if (!userData.user) {
                    return { data: null }
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, description, url_picture, active_organisation_id')
                    .eq('id', userData.user.id)
                    .maybeSingle()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                if (!data) {
                    return { data: null }
                }

                // Rollen ligger på memberships (US-59), ikke på profiles -
                // slår brugerens medlemskab af DEN AKTIVE organisation op for
                // at finde dens role_id.
                let roleId: string | null = null
                if (data.active_organisation_id) {
                    const { data: membership } = await supabase
                        .from('memberships')
                        .select('role_id')
                        .eq('user_id', data.id)
                        .eq('organisation_id', data.active_organisation_id)
                        .maybeSingle()
                    roleId = membership?.role_id ?? null
                }

                const [organisationName, roleName] = await Promise.all([
                    lookupName('organisations', data.active_organisation_id),
                    lookupName('roles', roleId),
                ])

                return {
                    data: {
                        id: data.id,
                        firstName: data.first_name,
                        lastName: data.last_name,
                        email: data.email,
                        description: data.description,
                        urlPicture: data.url_picture,
                        activeOrganisationId: data.active_organisation_id,
                        organisationName,
                        roleId,
                        roleName,
                    },
                }
            },

            providesTags: ['Profile'],
        }),

        // opdaterer kun de felter brugeren selv må ændre. Rolle og
        // organisation sendes bevidst ikke med - databasens
        // prevent_self_role_org_change-trigger ville alligevel afvise det.
        updateMyProfile: builder.mutation<void, UpdateProfileInput>({
            queryFn: async ({ firstName, lastName, description, urlPicture }) => {
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError || !userData.user) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: 'Du skal være logget ind for at redigere din profil.',
                        },
                    }
                }

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        description,
                        url_picture: urlPicture,
                    })
                    .eq('id', userData.user.id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // Får getMyProfile til at hente frisk data, så de nye
            // oplysninger vises umiddelbart efter en succesfuld opdatering.
            invalidatesTags: ['Profile'],
        }),
    }),
})

export const { useGetMyProfileQuery, useUpdateMyProfileMutation } = profileApi
