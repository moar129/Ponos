// src/store/apis/messageApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { ConversationParticipant, ConversationSummary, Message } from '../../types/messages/messagesTypes'

export const messageApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter alle mine samtaler (US-B7), med den anden deltagers navn
        // for 1:1 eller gruppenavn, plus seneste besked til forhåndsvisning.
        getMyConversations: builder.query<ConversationSummary[], void>({
            queryFn: async () => {
                const { data, error } = await supabase.rpc('get_my_conversations')

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                type Row = {
                    conversation_id: string
                    is_group: boolean
                    display_name: string | null
                    other_user_id: string | null
                    url_picture: string | null
                    last_message: string | null
                    last_message_at: string | null
                }

                return {
                    data: ((data ?? []) as Row[]).map((row) => ({
                        conversationId: row.conversation_id,
                        isGroup: row.is_group,
                        displayName: row.display_name,
                        otherUserId: row.other_user_id,
                        urlPicture: row.url_picture,
                        lastMessage: row.last_message,
                        lastMessageAt: row.last_message_at,
                    })),
                }
            },

            providesTags: ['Conversation'],
        }),

        // Finder eller opretter en 1:1-samtale med en given kontakt
        // (US-B2). Bruges når man klikker en kontakt i "Alle kontakter".
        getOrCreateDirectConversation: builder.mutation<string, { otherUserId: string }>({
            queryFn: async ({ otherUserId }) => {
                const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
                    p_other_user_id: otherUserId,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: data as string }
            },

            invalidatesTags: ['Conversation'],
        }),

        // Henter beskederne i en given samtale (US-B4). RLS afgrænser
        // allerede til samtaler, jeg selv deltager i.
                getMessages: builder.query<Message[], string>({
    queryFn: async (conversationId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, created_at, message_type')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } }
        }

        return {
            data: (data ?? []).map((row) => ({
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                content: row.content,
                createdAt: row.created_at,
                messageType: (row.message_type ?? 'user') as 'user' | 'system',
            })),
        }
    },

    providesTags: (_result, _error, conversationId) => [{ type: 'Message', id: conversationId }],

    // Live-opdatering (US-B8): mens en samtale er åben, abonneres direkte
    // på nye beskeder i netop den samtale. Dækker begge deltagere -
    // afsenderens egen sendMessage-mutation invaliderer allerede samme
    // tag lokalt (øjeblikkelig visning for afsenderen selv), mens
    // modtageren(e) får beskeden ind via dette realtime-abonnement uden
    // at skulle genindlæse eller skifte fane.
    async onCacheEntryAdded(conversationId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded

        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                                (payload) => {
                    const row = payload.new as {
                        id: string
                        conversation_id: string
                        sender_id: string
                        content: string
                        created_at: string
                        message_type: 'user' | 'system'
                    }

                    updateCachedData((draft) => {
                        if (draft.some((m) => m.id === row.id)) return
                        draft.push({
                            id: row.id,
                            conversationId: row.conversation_id,
                            senderId: row.sender_id,
                            content: row.content,
                            createdAt: row.created_at,
                            messageType: row.message_type ?? 'user',
                        })
                    })
                }
            )
            .subscribe()

        await cacheEntryRemoved
        supabase.removeChannel(channel)
    },
}),

        // Sender en besked i en samtale (US-B3).
        sendMessage: builder.mutation<void, { conversationId: string; content: string }>({
            queryFn: async ({ conversationId, content }) => {
                const { data: userData, error: userError } = await supabase.auth.getUser()
                if (userError || !userData.user) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Du skal være logget ind.' } }
                }

                const trimmed = content.trim()
                if (!trimmed) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Beskeden kan ikke være tom.' } }
                }

                const { error } = await supabase.from('messages').insert({
                    conversation_id: conversationId,
                    sender_id: userData.user.id,
                    content: trimmed,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: (_result, _error, { conversationId }) => [
                { type: 'Message', id: conversationId },
                'Conversation', // opdaterer "seneste besked"-forhåndsvisningen i samtalelisten
            ],
        }),

        // Opretter en gruppesamtale (US-B5). Opretteren tilføjes automatisk;
        // alle valgte deltagere skal være medlem af samme aktive organisation
        // som mig - RPC'en validerer det atomisk.
        createGroupConversation: builder.mutation<string, { name: string; participantIds: string[] }>({
            queryFn: async ({ name, participantIds }) => {
                const { data, error } = await supabase.rpc('create_group_conversation', {
                    p_name: name,
                    p_participant_ids: participantIds,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: data as string }
            },

            invalidatesTags: ['Conversation'],
        }),

        // Henter deltagerne i en samtale med navn/billede, så gruppebeskeder kan
        // vise hvem der har sendt hvad (US-B6). RLS på conversation_participants
        // afgrænser allerede til samtaler, jeg selv deltager i.
        getConversationParticipants: builder.query<ConversationParticipant[], string>({
            queryFn: async (conversationId) => {
                const { data: participants, error: participantsError } = await supabase
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', conversationId)

                if (participantsError) {
                    return { error: { status: 'CUSTOM_ERROR', error: participantsError.message } }
                }

                if (!participants || participants.length === 0) {
                    return { data: [] }
                }

                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, url_picture')
                    .in('id', participants.map((p) => p.user_id))

                if (profilesError) {
                    return { error: { status: 'CUSTOM_ERROR', error: profilesError.message } }
                }

                return {
                    data: (profiles ?? []).map((profile) => ({
                        userId: profile.id,
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        urlPicture: profile.url_picture,
                    })),
                }
            },

            providesTags: (_result, _error, conversationId) => [{ type: 'Conversation', id: conversationId }],
        }),
                // US-B9: tilføjer et eller flere medlemmer til en gruppesamtale.
        // Kører som RPC (add_group_participants), som validerer at
        // afsenderen selv er deltager, at samtalen er en gruppe, og at de
        // nye medlemmer hører til samme organisation.
        addGroupParticipants: builder.mutation<void, { conversationId: string; userIds: string[] }>({
            queryFn: async ({ conversationId, userIds }) => {
                if (userIds.length === 0) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Vælg mindst ét medlem.' } }
                }

                const { error } = await supabase.rpc('add_group_participants', {
                    p_conversation_id: conversationId,
                    p_user_ids: userIds,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: (_result, _error, { conversationId }) => [
                { type: 'Conversation', id: conversationId },
                'Conversation',
            ],
        }),

        // US-B9: fjerner et medlem fra en gruppesamtale. Kører som RPC
        // (remove_group_participant), som validerer at afsenderen selv er
        // deltager i samtalen.
        removeGroupParticipant: builder.mutation<void, { conversationId: string; userId: string }>({
            queryFn: async ({ conversationId, userId }) => {
                const { error } = await supabase.rpc('remove_group_participant', {
                    p_conversation_id: conversationId,
                    p_user_id: userId,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: (_result, _error, { conversationId }) => [
                { type: 'Conversation', id: conversationId },
                'Conversation',
            ],
        }),

                // US-B11: forlader en gruppesamtale, jeg selv er deltager i.
        // Kører som RPC (leave_group_conversation) af samme grund som
        // add/removeGroupParticipant - valideringen (er det en gruppe? er
        // jeg deltager?) skal ske atomisk.
        leaveGroupConversation: builder.mutation<void, { conversationId: string }>({
            queryFn: async ({ conversationId }) => {
                const { error } = await supabase.rpc('leave_group_conversation', {
                    p_conversation_id: conversationId,
                })

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            // 'Conversation' bredt: samtalen skal forsvinde fra
            // getMyConversations (jeg er ikke længere deltager), og et evt.
            // åbent GroupConversationComponent/getConversationParticipants
            // for denne samtale skal ikke længere kunne bruges.
            invalidatesTags: (_result, _error, { conversationId }) => [
                { type: 'Conversation', id: conversationId },
                'Conversation',
            ],
        }),
    }),
})

export const {
    useGetMyConversationsQuery,
    useGetOrCreateDirectConversationMutation,
    useGetMessagesQuery,
    useSendMessageMutation,
    useCreateGroupConversationMutation,
    useGetConversationParticipantsQuery,
    useAddGroupParticipantsMutation,
    useRemoveGroupParticipantMutation,
    useLeaveGroupConversationMutation,
} = messageApi