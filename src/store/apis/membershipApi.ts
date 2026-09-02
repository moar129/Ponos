// src/store/apis/membershipApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { PendingMembershipRequest } from '../../types/membership/membershipType'

export const membershipApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter den indloggede brugers evt. ventende (Pending) medlemsanmodning.
        // Bruges af PendingRequestBanner til at vise "din anmodning afventer"-beskeden.
        getMyPendingRequest: builder.query<PendingMembershipRequest | null, void>({
            queryFn: async () => {
                // Finder den aktuelt indloggede bruger direkte fra Supabase
                // (i stedet for at læse session fra Redux, så dette endpoint
                // ikke er afhængigt af authSlice/useAuthListener)
                const { data: userData, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    return { error: { status: 'CUSTOM_ERROR', error: userError.message } }
                }

                // Ingen indlogget bruger -> ingen anmodning at vise
                if (!userData.user) {
                    return { data: null }
                }

                // Henter evt. Pending-anmodning for brugeren, inkl.
                // organisationens navn via join (samme forespørgsel som
                // useMembershipListener bruger i dag)
                const { data, error } = await supabase
                    .from('membership_requests')
                    .select('organisation_id, organisations(name)')
                    .eq('user_id', userData.user.id)
                    .eq('status', 'Pending')
                    .maybeSingle()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                // Ingen ventende anmodning fundet
                if (!data) {
                    return { data: null }
                }

                // Formaterer resultatet til vores PendingMembershipRequest-type
                return {
                    data: {
                        organisationId: data.organisation_id,
                        organisationName: (data.organisations as unknown as { name: string }).name,
                    },
                }
            },

            // Mærker denne querys cache med 'PendingRequest', så en fremtidig
            // acceptMembershipRequest/rejectMembershipRequest-mutation kan
            // invalidere den og tvinge en frisk hentning
            providesTags: ['PendingRequest'],
        }),
    }),
})

export const { useGetMyPendingRequestQuery } = membershipApi