// src/store/apis/membershipApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type {
    MembershipRequest,
    PendingMembershipRequest,
    ReviewMembershipRequestInput,
} from '../../types/membership/membershipType'

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
        // valgte organisation. Bruges af OrganisationPage.tsx.
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

        // henter de ventende anmodninger, administratoren må se.
        // Der filtreres bevidst IKKE på organisation her - RLS-policy'en
        // "Se egne anmodninger eller (som admin) anmodninger i egen org"
        // begrænser allerede rækkerne server-side. En ikke-admin får
        // derfor kun sine egne anmodninger, aldrig andres.
        getPendingMembershipRequests: builder.query<MembershipRequest[], void>({
            queryFn: async () => {
                const { data: requests, error: requestsError } = await supabase
                    .from('membership_requests')
                    .select('id, user_id, requested_at')
                    .eq('status', 'Pending')
                    .order('requested_at')

                if (requestsError) {
                    return { error: { status: 'CUSTOM_ERROR', error: requestsError.message } }
                }

                if (!requests || requests.length === 0) {
                    return { data: [] }
                }

                // Profilerne hentes i et separat kald i stedet for som
                // PostgREST-join, af samme grund som lookupName i
                // profileApi.ts: joins er skrøbelige her, og en fejlende
                // join ville vælte hele listen.
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .in('id', requests.map((request) => request.user_id))

                if (profilesError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profilesError.message } }
                }

                const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

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
            },

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
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                // Ingen rækker ramt = enten blokeret af RLS eller allerede
                // behandlet af en anden. Uden dette tjek ville UI'en melde
                // succes på en opdatering, der aldrig skete.
                if (!data || data.length === 0) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: 'Anmodningen kunne ikke behandles. Den er måske allerede behandlet, eller du mangler rettigheder.',
                        },
                    }
                }

                return { data: undefined }
            },

            // Listen hentes friskt, så den behandlede anmodning forsvinder.
            // 'Profile' invalideres også: accepterer man en anmodning,
            // ændres ansøgerens organisation - og ser man sin egen liste,
            // skal banneret opdateres. 'Role' invalideres, så det
            // nyaccepterede medlem straks dukker op i medlemslisten på
            // /roller uden at admin skal genindlæse siden.
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