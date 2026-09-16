// src/store/apis/notificationApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { AppNotification } from '../../types/notification/notificationTypes'

function mapNotificationRow(row: {
    id: string
    type: string
    title: string
    body: string | null
    link: string | null
    reference_id: string | null
    is_read: boolean
    dismissed_at: string | null
    created_at: string
}): AppNotification {
    return {
        id: row.id,
        type: row.type as AppNotification['type'],
        title: row.title,
        body: row.body,
        link: row.link,
        referenceId: row.reference_id,
        isRead: row.is_read,
        dismissedAt: row.dismissed_at,
        createdAt: row.created_at,
    }
}

export const notificationApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getMyNotifications: builder.query<AppNotification[], { limit?: number; onlyVisible?: boolean } | void>({
            queryFn: async (arg) => {
                const limit = arg?.limit ?? 50
                const onlyVisible = arg?.onlyVisible ?? true

                let query = supabase
                    .from('notifications')
                    .select('id, type, title, body, link, reference_id, is_read, dismissed_at, created_at')
                    .order('created_at', { ascending: false })
                    .limit(limit)

                if (onlyVisible) {
                    query = query.is('dismissed_at', null)
                }

                const { data, error } = await query

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: (data ?? []).map(mapNotificationRow) }
            },

            providesTags: (result) =>
                result
                    ? [
                        { type: 'Notification' as const, id: 'LIST' },
                        ...result.map((n) => ({ type: 'Notification' as const, id: n.id })),
                    ]
                    : [{ type: 'Notification' as const, id: 'LIST' }],

            // Live-opdatering (US-B8): abonnerer på nye rækker i
            // notifications for netop mig. Da trg_notify_new_message
            // allerede opretter en notifikation for hver øvrig deltager
            // ved hver ny besked, fungerer dette abonnement som ét samlet
            // "der er sket noget"-signal for BÅDE selve klokken og
            // samtalelisten (via reference_id, som for besked-typen er
            // conversation_id) - ingen separat, bredt abonnement på hele
            // messages-tabellen er nødvendigt her. Kun det åbne samtale-
            // vindue (getMessages nedenfor) abonnerer selvstændigt, for at
            // få selve beskedindholdet ind uden en ekstra runde-tur.
            async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }) {
                await cacheDataLoaded

                const { data: userData } = await supabase.auth.getUser()
                const userId = userData.user?.id
                if (!userId) return

                const channel = supabase
                    .channel(`notifications:${userId}`)
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                        (payload) => {
                            const row = payload.new as {
                                id: string
                                type: string
                                title: string
                                body: string | null
                                link: string | null
                                reference_id: string | null
                                is_read: boolean
                                dismissed_at: string | null
                                created_at: string
                            }

                            // Sætter den nye notifikation direkte ind i cachen
                            // i stedet for at genhente hele listen - klokken
                            // opdaterer sig med det samme uden netværkskald.
                            updateCachedData((draft) => {
                                if (draft.some((n) => n.id === row.id)) return
                                draft.unshift(mapNotificationRow(row))
                            })

                            // Besked-notifikationer bærer samtalens id i
                            // reference_id - invaliderer netop den samtales
                            // besked-cache og samtalelisten, så "seneste
                            // besked"-forhåndsvisningen og evt. åbne
                            // GroupConversationComponent/ConversationComponent
                            // opdaterer sig uden manuel genindlæsning.
                            if (row.type === 'message' && row.reference_id) {
                                dispatch(
                                    supabaseApi.util.invalidateTags([
                                        { type: 'Message', id: row.reference_id },
                                        'Conversation',
                                    ])
                                )
                            }
                        }
                    )
                    .subscribe()

                await cacheEntryRemoved
                supabase.removeChannel(channel)
            },
        }),

        markNotificationRead: builder.mutation<void, { id: string }>({
            queryFn: async ({ id }) => {
                const { error } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Notification', id },
                { type: 'Notification', id: 'LIST' },
            ],
        }),

        markAllNotificationsRead: builder.mutation<void, void>({
            queryFn: async () => {
                const { data: userData, error: userError } = await supabase.auth.getUser()
                if (userError || !userData.user) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Du skal være logget ind.' } }
                }

                const { error } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', userData.user.id)
                    .eq('is_read', false)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
        }),

        // Skjuler notifikationen fra klokke-dropdown'en (og evt. "se
        // alle"-siden, afhængig af filter), UDEN at slette den permanent -
        // den kan fortsat findes og rigtigt slettes fra "Se alle
        // notifikationer" senere. Bruges af X-knappen i dropdown'en.
        dismissNotification: builder.mutation<void, { id: string }>({
            queryFn: async ({ id }) => {
                const { error } = await supabase
                    .from('notifications')
                    .update({ dismissed_at: new Date().toISOString() })
                    .eq('id', id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
        }),

        // Gør en tidligere skjult notifikation synlig igen (fortryd).
        undismissNotification: builder.mutation<void, { id: string }>({
            queryFn: async ({ id }) => {
                const { error } = await supabase
                    .from('notifications')
                    .update({ dismissed_at: null })
                    .eq('id', id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
        }),

        // Sletter en notifikation PERMANENT. Kun tilgængelig fra "Se alle
        // notifikationer"-siden.
        deleteNotification: builder.mutation<void, { id: string }>({
            queryFn: async ({ id }) => {
                const { error } = await supabase.from('notifications').delete().eq('id', id)

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },

            invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
        }),
    }),
})

export const {
    useGetMyNotificationsQuery,
    useMarkNotificationReadMutation,
    useMarkAllNotificationsReadMutation,
    useDismissNotificationMutation,
    useUndismissNotificationMutation,
    useDeleteNotificationMutation,
} = notificationApi