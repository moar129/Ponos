// src/store/apis/messageApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { ConversationSummary, Message } from '../../types/messages/messagesTypes'

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
                    .select('id, conversation_id, sender_id, content, created_at')
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
                    })),
                }
            },

            providesTags: (_result, _error, conversationId) => [{ type: 'Message', id: conversationId }],
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
    }),
})

export const {
    useGetMyConversationsQuery,
    useGetOrCreateDirectConversationMutation,
    useGetMessagesQuery,
    useSendMessageMutation,
} = messageApi