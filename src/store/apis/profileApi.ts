// src/store/apis/profileApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { Profile, UpdateProfileInput } from '../../types/profile/profileType'
import { mapDbError, QueryFailure, runQuery } from './apiError'
import { getCurrentUserId, getMembershipRoleId, getOptionalUserId } from './session'

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

export type ProfileRow = {
    id: string
    first_name: string
    last_name: string
    email: string
    url_picture: string | null
}

/**
 * Henter profiler for en række bruger-id'er i ét kald og returnerer dem
 * slået op på id. Profiler hentes altid separat i stedet for som
 * PostgREST-join, af samme grund som lookupName: en fejlende join ville
 * vælte hele listen. En profil RLS ikke lader os læse, mangler bare i
 * mappet - kalderen afgør, om rækken så udelades eller vises uden navn.
 */
export async function fetchProfilesByIds(ids: Iterable<string>): Promise<Map<string, ProfileRow>> {
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) return new Map()

    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, url_picture')
        .in('id', uniqueIds)

    if (error) throw new QueryFailure(mapDbError(error))
    return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
}

export const profileApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // henter den indloggede brugers egen profil. RLS sørger for,
        // at man aldrig kan læse andres profil end sin egen (eller nogen i
        // egen organisation) - .eq('id', ...) her er kun for at ramme
        // netop min egen række.
        getMyProfile: builder.query<Profile | null, void>({
            queryFn: () => runQuery(async () => {
                // Ingen session (fx lige efter logout) er ikke en fejl -
                // så findes der bare ingen profil at vise.
                const userId = await getOptionalUserId()
                if (!userId) return { data: null }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, description, url_picture, active_organisation_id')
                    .eq('id', userId)
                    .maybeSingle()

                if (error) return { error: mapDbError(error) }
                if (!data) return { data: null }

                const roleId = data.active_organisation_id
                    ? await getMembershipRoleId(data.id, data.active_organisation_id)
                    : null

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
            }),

            providesTags: ['Profile'],
        }),

        // opdaterer kun de felter brugeren selv må ændre. Rolle og
        // organisation sendes bevidst ikke med - databasens
        // prevent_self_role_org_change-trigger ville alligevel afvise det.
        updateMyProfile: builder.mutation<void, UpdateProfileInput>({
            queryFn: ({ firstName, lastName, description, urlPicture }) => runQuery(async () => {
                const userId = await getCurrentUserId()

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        description,
                        url_picture: urlPicture,
                    })
                    .eq('id', userId)

                if (error) return { error: mapDbError(error) }
                return { data: undefined }
            }),

            // Får getMyProfile til at hente frisk data, så de nye
            // oplysninger vises umiddelbart efter en succesfuld opdatering.
            invalidatesTags: ['Profile'],
        }),
    }),
})

export const { useGetMyProfileQuery, useUpdateMyProfileMutation } = profileApi
