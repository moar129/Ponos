// src/store/apis/invitationApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type {
    MembershipInvitation,
    RespondInvitationInput,
    SentInvitation,
} from '../../types/membership/membershipType'

export const invitationApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter den indloggede brugers egne ventende invitationer (US-67),
        // til Organisation-fanen og PendingRequestBanner. Joinet med
        // organisations(name) - tilladt af den nye "Se organisation man er
        // inviteret til"-policy, selvom brugeren ikke er medlem endnu.
        getMyPendingInvitations: builder.query<MembershipInvitation[], void>({
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

                const { data, error } = await supabase
                    .from('membership_invitations')
                    .select('id, organisation_id, created_at, organisations(name)')
                    .eq('invited_user_id', userData.user.id)
                    .eq('status', 'Pending')
                    .order('created_at')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return {
                    data: (data ?? []).map((row) => ({
                        id: row.id,
                        organisationId: row.organisation_id,
                        organisationName: (row.organisations as unknown as { name: string }).name,
                        invitedAt: row.created_at,
                    })),
                }
            },

            providesTags: ['MembershipInvitation'],
        }),

        // Henter de ventende invitationer, DEN AKTIVE organisation har
        // sendt (admin-siden). Samme to-trins mønster som
        // getPendingMembershipRequests i membershipApi.ts - en fejlende
        // PostgREST-join ville ellers vælte hele listen.
        getSentInvitations: builder.query<SentInvitation[], void>({
            queryFn: async () => {
                const { data: invitations, error: invitationsError } = await supabase
                    .from('membership_invitations')
                    .select('id, invited_user_id, created_at')
                    .eq('status', 'Pending')
                    .order('created_at')

                if (invitationsError) {
                    return { error: { status: 'CUSTOM_ERROR', error: invitationsError.message } }
                }

                if (!invitations || invitations.length === 0) {
                    return { data: [] }
                }

                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .in('id', invitations.map((invitation) => invitation.invited_user_id))

                if (profilesError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profilesError.message } }
                }

                const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

                return {
                    data: invitations.flatMap((invitation) => {
                        const profile = profileById.get(invitation.invited_user_id)

                        // Kan profilen ikke læses (RLS), udelades rækken
                        // frem for at vise en invitation uden modtager.
                        if (!profile) return []

                        return [{
                            id: invitation.id,
                            userId: invitation.invited_user_id,
                            firstName: profile.first_name,
                            lastName: profile.last_name,
                            email: profile.email,
                            invitedAt: invitation.created_at,
                        }]
                    }),
                }
            },

            providesTags: ['MembershipInvitation'],
        }),

        // Inviterer en eksisterende Ponos-bruger (via præcis email) til
        // den aktive organisation (US-67). Kører server-side som RPC'en
        // invite_member, da klienten kun kender en email, ikke et
        // bruger-id - RPC'en slår id'et op og validerer (findes brugeren,
        // er de allerede medlem/allerede inviteret) atomisk.
        inviteMember: builder.mutation<void, { email: string }>({
            queryFn: async ({ email }) => {
                const trimmed = email.trim()

                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Email skal udfyldes.' } }
                }

                const { error } = await supabase.rpc('invite_member', { p_email: trimmed })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['MembershipInvitation'],
        }),

        // Fortryder en ventende invitation, organisationen selv har sendt
        // (US-67). RLS ("Admin kan annullere ventende invitation i egen
        // organisation") afviser dette server-side for ikke-berettigede.
        cancelInvitation: builder.mutation<void, { invitationId: string }>({
            queryFn: async ({ invitationId }) => {
                const { error } = await supabase
                    .from('membership_invitations')
                    .delete()
                    .eq('id', invitationId)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: ['MembershipInvitation'],
        }),

        // Modtageren accepterer eller afviser sin egen invitation. Kun
        // status sendes med - trigger'en
        // handle_membership_invitation_status_change opretter ved accept
        // medlemskabet og sætter evt. aktiv organisation. RLS sikrer, at
        // kun modtageren selv kan ramme rækken.
        respondToInvitation: builder.mutation<void, RespondInvitationInput>({
            queryFn: async ({ invitationId, decision }) => {
                const { data, error } = await supabase
                    .from('membership_invitations')
                    .update({ status: decision })
                    .eq('id', invitationId)
                    .eq('status', 'Pending')
                    .select('id')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                if (!data || data.length === 0) {
                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: 'Invitationen kunne ikke behandles. Den er måske allerede behandlet.',
                        },
                    }
                }

                return { data: undefined }
            },

            // Accept kan skifte aktiv organisation/privilegier for
            // modtageren - samme bredde som createOrganisation.
            invalidatesTags: ['MembershipInvitation', 'Organisation', 'Profile', 'Privilege', 'Membership'],
        }),
    }),
})

export const {
    useGetMyPendingInvitationsQuery,
    useGetSentInvitationsQuery,
    useInviteMemberMutation,
    useCancelInvitationMutation,
    useRespondToInvitationMutation,
} = invitationApi
