// src/store/apis/membershipApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { PendingMembershipRequest } from '../../types/membership/membershipType'

export const membershipApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyPendingRequest: builder.query<PendingMembershipRequest | null, void>({
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

                const { data, error } = await supabase
                    .from('membership_requests')
                    .select('organisation_id, organisations(name)')
                    .eq('user_id', userData.user.id)
                    .eq('status', 'Pending')
                    .maybeSingle()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                if (!data) {
                    return { data: null }
                }

                return {
                    data: {
                        organisationId: data.organisation_id,
                        organisationName: (data.organisations as unknown as { name: string }).name,
                    },
                }
            },

            providesTags: ['PendingRequest'],
        }),

        // Sender en medlemsanmodning for den indloggede bruger til den
        // valgte organisation. Bruges af RequestMembership.tsx.
        requestMembership: builder.mutation<void, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                // Finder den aktuelt indloggede bruger direkte fra Supabase
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError || !userData.user) {
                    return {
                        error: { 
                            status: 'CUSTOM_ERROR', 
                            error: 'Du skal være logget ind for at anmode om medlemskab.' 
                        },
                    }
                }

                // Indsætter selve anmodningen. Status sættes automatisk til
                // 'Pending' af databasens default-værdi.
                const { error: insertError } = await supabase
                    .from('membership_requests')
                    .insert({
                        user_id: userData.user.id,
                        organisation_id: organisationId,
                    })

                if (insertError) {
                    // Postgres-fejlkode 23505 = unique constraint violation.
                    // Betyder her: brugeren har allerede en Pending-anmodning
                    // til denne organisation (jf. unique index i skemaet).
                    if (insertError.code === '23505') {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: 'Du har allerede en ventende anmodning til denne organisation.',
                            },
                        }
                    }
                    return { error: { status: 'CUSTOM_ERROR', error: insertError.message } }
                }

                return { data: undefined }
            },

            // Efter en vellykket indsendelse invalideres 'PendingRequest',
            // så getMyPendingRequest automatisk henter frisk data igen -
            // det er det, der får banneret til at dukke op med det samme,
            // uden manuel Redux-dispatch.
            invalidatesTags: ['PendingRequest'],
        }),
    }),
})

export const { useGetMyPendingRequestQuery, useRequestMembershipMutation } = membershipApi