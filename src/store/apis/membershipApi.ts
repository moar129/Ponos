// src/store/apis/membershipApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type {
    MembershipRequest,
    PendingMembershipRequest,
    ReviewMembershipRequestInput,
} from '../../types/membership/membershipType'
import { errorCode, mapDbError, runQuery } from './apiError'
import { getCurrentUserId, getOptionalUserId } from './session'
import { fetchProfilesByIds } from './profileApi'

export const membershipApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyPendingRequest: builder.query<PendingMembershipRequest | null, void>({
            queryFn: () => runQuery(async () => {
                const userId = await getOptionalUserId()
                if (!userId) return { data: null }

                const { data, error } = await supabase
                    .from('membership_requests')
                    .select('organisation_id, organisations(name)')
                    .eq('user_id', userId)
                    .eq('status', 'Pending')
                    .maybeSingle()

                if (error) {
                    return { error: mapDbError(error) }
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
            }),

            providesTags: ['PendingRequest'],
        }),

        // Sender en medlemsanmodning for den indloggede bruger til den
        // valgte organisation. Bruges af dashboardets Organisation-fane
        // (OrganisationTab.tsx).
        requestMembership: builder.mutation<void, { organisationId: string }>({
            queryFn: ({ organisationId }) => runQuery(async () => {
                const userId = await getCurrentUserId()

                // Indsætter selve anmodningen. Status sættes automatisk til
                // 'Pending' af databasens default-værdi.
                const { error: insertError } = await supabase
                    .from('membership_requests')
                    .insert({
                        user_id: userId,
                        organisation_id: organisationId,
                    })

                // unique: brugeren har allerede en Pending-anmodning til
                // denne organisation (jf. unique index i skemaet).
                if (insertError) return { error: mapDbError(insertError, { unique: 'duplicateMembershipRequest' }) }
                return { data: undefined }
            }),

            // Efter en vellykket indsendelse invalideres 'PendingRequest',
            // så getMyPendingRequest automatisk henter frisk data igen -
            // det er det, der får banneret til at dukke op med det samme,
            // uden manuel Redux-dispatch.
            invalidatesTags: ['PendingRequest'],
        }),

        // henter de ventende anmodninger, administratoren må se.
        // Der filtreres bevidst IKKE på organisation her - RLS-policy'en
        // "Se egne anmodninger eller (som admin) anmodninger i egen org"
        // begrænser allerede rækkerne server-side. En ikke-admin får
        // derfor kun sine egne anmodninger, aldrig andres.
        getPendingMembershipRequests: builder.query<MembershipRequest[], void>({
            queryFn: () => runQuery(async () => {
                const { data: requests, error: requestsError } = await supabase
                    .from('membership_requests')
                    .select('id, user_id, requested_at')
                    .eq('status', 'Pending')
                    .order('requested_at')

                if (requestsError) {
                    return { error: mapDbError(requestsError) }
                }

                if (!requests || requests.length === 0) {
                    return { data: [] }
                }

                const profileById = await fetchProfilesByIds(requests.map((request) => request.user_id))

                return {
                    data: requests.flatMap((request) => {
                        const profile = profileById.get(request.user_id)

                        // Kan profilen ikke læses (RLS), udelades rækken
                        // frem for at vise en anmodning uden afsender.
                        if (!profile) return []

                        return [{
                            id: request.id,
                            userId: request.user_id,
                            firstName: profile.first_name,
                            lastName: profile.last_name,
                            email: profile.email,
                            requestedAt: request.requested_at,
                        }]
                    }),
                }
            }),

            providesTags: ['MembershipRequest'],
        }),

        // accepter eller afvis. Kun status sendes med -
        // trigger'en handle_membership_request_status_change sætter
        // reviewed_at/reviewed_by og tilknytter ved accept brugeren til
        // organisationen. RLS sikrer, at kun en admin i den rigtige
        // organisation kan ramme rækken.
        reviewMembershipRequest: builder.mutation<void, ReviewMembershipRequestInput>({
            queryFn: async ({ requestId, decision }) => {
                const { data, error } = await supabase
                    .from('membership_requests')
                    .update({ status: decision })
                    .eq('id', requestId)
                    .eq('status', 'Pending')
                    .select('id')

                if (error) {
                    return { error: mapDbError(error) }
                }

                // Ingen rækker ramt = enten blokeret af RLS eller allerede
                // behandlet af en anden. Uden dette tjek ville UI'en melde
                // succes på en opdatering, der aldrig skete.
                if (!data || data.length === 0) return { error: errorCode('requestAlreadyHandled') }

                return { data: undefined }
            },

            // Listen hentes friskt, så den behandlede anmodning forsvinder.
            // 'Profile' invalideres også: accepterer man en anmodning,
            // ændres ansøgerens organisation - og ser man sin egen liste,
            // skal banneret opdateres. 'Role' invalideres, så det
            // nyaccepterede medlem straks dukker op i medlemslisten i
            // dashboardets Administration-fane uden at admin skal
            // genindlæse siden.
            invalidatesTags: ['MembershipRequest', 'Profile', 'PendingRequest', 'Role'],
        }),
    }),
})

export const {
    useGetMyPendingRequestQuery,
    useRequestMembershipMutation,
    useGetPendingMembershipRequestsQuery,
    useReviewMembershipRequestMutation,
} = membershipApi