// src/store/apis/messageApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { ConversationParticipant, ConversationSummary, Message, TaskChatChoice } from '../../types/messages/messagesTypes'
import type { ETaskStatus } from '../../types/Task/Task'
import { errorCode, mapDbError, runQuery } from './apiError'
import { getCurrentUserId } from './session'
import { fetchProfilesByIds } from './profileApi'

type MessageRow = {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    created_at: string
    message_type: 'user' | 'system' | null
    edited_at: string | null
    deleted_at: string | null
}

function toMessage(row: MessageRow): Message {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        content: row.content,
        createdAt: row.created_at,
        messageType: row.message_type ?? 'user',
        editedAt: row.edited_at,
        deletedAt: row.deleted_at,
    }
}

export const messageApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter alle mine samtaler (US-B7), med den anden deltagers navn
        // for 1:1 eller gruppenavn, plus seneste besked til forhåndsvisning.
        getMyConversations: builder.query<ConversationSummary[], void>({
            queryFn: async () => {
                const { data, error } = await supabase.rpc('get_my_conversations')

                if (error) {
                    return { error: mapDbError(error) }
                }

                type Row = {
                    conversation_id: string
                    is_group: boolean
                    display_name: string | null
                    other_user_id: string | null
                    url_picture: string | null
                    last_message: string | null
                    last_message_at: string | null
                    last_message_deleted: boolean
                    unread: boolean // NYT
                    task_id: string | null
                    room_id: string | null
                    task_status: ETaskStatus | null
                    closed: boolean
                    completion_choice: TaskChatChoice | null
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
                        lastMessageDeleted: row.last_message_deleted,
                        unread: row.unread, // NYT
                        taskId: row.task_id,
                        roomId: row.room_id,
                        taskStatus: row.task_status,
                        closed: row.closed,
                        completionChoice: row.completion_choice,
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
                    return { error: mapDbError(error) }
                }

                return { data: data as string }
            },

            invalidatesTags: ['Conversation'],
        }),

        getMessages: builder.query<Message[], string>({
    queryFn: async (conversationId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, created_at, message_type, edited_at, deleted_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) {
            return { error: mapDbError(error) }
        }

        return { data: ((data ?? []) as MessageRow[]).map(toMessage) }
    },

    providesTags: (_result, _error, conversationId) => [{ type: 'Message', id: conversationId }],

    async onCacheEntryAdded(conversationId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }) {
        await cacheDataLoaded

        const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    const row = payload.new as MessageRow

                    updateCachedData((draft) => {
                        if (draft.some((m) => m.id === row.id)) return
                        draft.push(toMessage(row))
                    })
                }
            )
            // US-B13: en redigering eller sletning ankommer som en UPDATE
            // (content/edited_at hhv. deleted_at ændres), ikke en ny INSERT -
            // uden dette abonnement ville modtageren aldrig se rettelsen
            // eller slettelsen, før de forlod og genåbnede samtalen.
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    const row = payload.new as {
                        id: string
                        content: string
                        edited_at: string | null
                        deleted_at: string | null
                    }

                    updateCachedData((draft) => {
                        const message = draft.find((m) => m.id === row.id)
                        if (message) {
                            message.content = row.content
                            message.editedAt = row.edited_at
                            message.deletedAt = row.deleted_at
                        }
                    })

                    // Samtalelistens preview kan vise netop denne besked.
                    dispatch(supabaseApi.util.invalidateTags(['Conversation']))
                }
            )
            .subscribe()

        await cacheEntryRemoved
        supabase.removeChannel(channel)
    },
}),

        // Sender en besked i en samtale (US-B3).
        sendMessage: builder.mutation<void, { conversationId: string; content: string }>({
            queryFn: ({ conversationId, content }) => runQuery(async () => {
                const userId = await getCurrentUserId()

                const trimmed = content.trim()
                if (!trimmed) return { error: errorCode('required.message') }

                const { error } = await supabase.from('messages').insert({
                    conversation_id: conversationId,
                    sender_id: userId,
                    content: trimmed,
                })

                if (error) return { error: mapDbError(error) }
                return { data: undefined }
            }),

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
                    return { error: mapDbError(error) }
                }

                return { data: data as string }
            },

            invalidatesTags: ['Conversation'],
        }),

        // Henter deltagerne i en samtale med navn/billede, så gruppebeskeder kan
        // vise hvem der har sendt hvad (US-B6). RLS på conversation_participants
        // afgrænser allerede til samtaler, jeg selv deltager i.
        // getConversationParticipants: tilføj last_read_at til select + mapping
getConversationParticipants: builder.query<ConversationParticipant[], string>({
    queryFn: (conversationId) => runQuery(async () => {
        const { data: participants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id, last_read_at')
            .eq('conversation_id', conversationId)

        if (participantsError) {
            return { error: mapDbError(participantsError) }
        }

        if (!participants || participants.length === 0) {
            return { data: [] }
        }

        const profileById = await fetchProfilesByIds(participants.map((p) => p.user_id))

        return {
            data: participants.flatMap((participant) => {
                const profile = profileById.get(participant.user_id)
                if (!profile) return []
                return [{
                    userId: profile.id,
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    urlPicture: profile.url_picture,
                    lastReadAt: participant.last_read_at ?? null,
                }]
            }),
        }
    }),

    providesTags: (_result, _error, conversationId) => [{ type: 'Conversation', id: conversationId }],

    // US-B12: mens en samtale er åben, abonneres på ændringer i
    // deltagernes last_read_at, så afsenderen ser "Set"-status opdatere
    // sig live, når modtageren åbner samtalen - uden at skulle genhente
    // hele deltagerlisten.
    async onCacheEntryAdded(conversationId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded

        const channel = supabase
            .channel(`conversation_participants:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversation_participants',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const row = payload.new as { user_id: string; last_read_at: string | null }

                    updateCachedData((draft) => {
                        const participant = draft.find((p) => p.userId === row.user_id)
                        if (participant) participant.lastReadAt = row.last_read_at
                    })
                }
            )
            .subscribe()

        await cacheEntryRemoved
        supabase.removeChannel(channel)
    },
}),

       // US-B12: markerer den aktive samtale som læst af mig. Kaldes fra
        // ConversationComponent/GroupConversationComponent, når samtalen er
        // åben og når nye beskeder ankommer i den.
        markConversationRead: builder.mutation<void, { conversationId: string }>({
            queryFn: async ({ conversationId }) => {
                const { error } = await supabase.rpc('mark_conversation_read', {
                    p_conversation_id: conversationId,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: undefined }
            },

            // Optimistisk: fjerner ulæst-prikken i samtalelisten med det samme,
            // i stedet for at vente på et roundtrip til serveren. Rulles tilbage
            // automatisk, hvis RPC-kaldet fejler. Andre deltageres visning
            // (readSummary i grupper, "Set"-status i 1:1) opdateres fortsat via
            // realtime-abonnementet i getConversationParticipants - det er kun
            // MIN egen unread-status i getMyConversations, der ikke længere kan
            // stå uden invalidering, nu hvor den vises i UI'en.
            async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    messageApi.util.updateQueryData('getMyConversations', undefined, (draft) => {
                        const conversation = draft.find((c) => c.conversationId === conversationId)
                        if (conversation) conversation.unread = false
                    })
                )

                try {
                    await queryFulfilled
                } catch {
                    patchResult.undo()
                }
            },
        }),
                // US-B9: tilføjer et eller flere medlemmer til en gruppesamtale.
        // Kører som RPC (add_group_participants), som validerer at
        // afsenderen selv er deltager, at samtalen er en gruppe, og at de
        // nye medlemmer hører til samme organisation.
        addGroupParticipants: builder.mutation<void, { conversationId: string; userIds: string[] }>({
            queryFn: async ({ conversationId, userIds }) => {
                if (userIds.length === 0) return { error: errorCode('required.atLeastOneMember') }

                const { error } = await supabase.rpc('add_group_participants', {
                    p_conversation_id: conversationId,
                    p_user_ids: userIds,
                })

                if (error) {
                    return { error: mapDbError(error) }
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
                    return { error: mapDbError(error) }
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
                    return { error: mapDbError(error) }
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

        // US-B13: redigerer en besked jeg selv har sendt. RPC'en afviser hvis
// den ikke længere er samtalens seneste (ikke-slettede) besked.
editMessage: builder.mutation<void, { messageId: string; conversationId: string; content: string }>({
    queryFn: async ({ messageId, content }) => {
        const { error } = await supabase.rpc('edit_message', {
            p_message_id: messageId,
            p_content: content,
        })

        if (error) {
            return { error: mapDbError(error) }
        }

        return { data: undefined }
    },

    invalidatesTags: (_result, _error, { conversationId }) => [{ type: 'Message', id: conversationId }, 'Conversation'],
}),

// US-B13: soft-sletter en besked jeg selv har sendt.
deleteMessage: builder.mutation<void, { messageId: string; conversationId: string }>({
    queryFn: async ({ messageId }) => {
        const { error } = await supabase.rpc('delete_message', { p_message_id: messageId })

        if (error) {
            return { error: mapDbError(error) }
        }

        return { data: undefined }
    },

    invalidatesTags: (_result, _error, { conversationId }) => [{ type: 'Message', id: conversationId }, 'Conversation'],
}),

        // Rum-chat for et rolle-låst rum. RPC'en tjekker can_access_task_room
        // og tilføjer mig som deltager, hvis jeg mangler (fx nyt medlem eller
        // ny rolle siden rummet blev oprettet), og returnerer samtalens id.
        getOrJoinRoomConversation: builder.mutation<string, { roomId: string }>({
            queryFn: async ({ roomId }) => {
                const { data, error } = await supabase.rpc('get_or_join_room_conversation', {
                    p_room_id: roomId,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: data as string }
            },

            invalidatesTags: ['Conversation'],
        }),

        // Opgave-chat for en opgave, jeg er tilmeldt - melder mig ind igen,
        // hvis jeg har forladt den (eller den er arkiveret, fordi alle lukkede).
        joinTaskConversation: builder.mutation<string, { taskId: string }>({
            queryFn: async ({ taskId }) => {
                const { data, error } = await supabase.rpc('join_task_conversation', {
                    p_task_id: taskId,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: data as string }
            },

            invalidatesTags: ['Conversation'],
        }),

        // Mit eget valg i en afsluttet opgaves chat: behold aktiv eller luk
        // (skrivebeskyttet for mig). Nulstilles af databasen, hvis opgaven
        // genåbnes.
        setTaskChatChoice: builder.mutation<void, { conversationId: string; choice: TaskChatChoice }>({
            queryFn: async ({ conversationId, choice }) => {
                const { error } = await supabase.rpc('set_task_chat_choice', {
                    p_conversation_id: conversationId,
                    p_choice: choice,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: undefined }
            },

            invalidatesTags: ['Conversation'],
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
    useMarkConversationReadMutation,
    useEditMessageMutation,
    useDeleteMessageMutation,
    useGetOrJoinRoomConversationMutation,
    useJoinTaskConversationMutation,
    useSetTaskChatChoiceMutation,
} = messageApi