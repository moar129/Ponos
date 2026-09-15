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
        createdAt: row.created_at,
    }
}

export const notificationApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter mine seneste notifikationer (US-B8), nyeste først. RLS
        // ("Se egne notifikationer") afgrænser allerede til egne rækker -
        // notifikationer oprettes udelukkende server-side via triggers
        // (nye beskeder, opgavetildeling/-redigering/-afslutning), aldrig
        // direkte fra klienten.
        getMyNotifications: builder.query<AppNotification[], void>({
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('id, type, title, body, link, reference_id, is_read, created_at')
                    .order('created_at', { ascending: false })
                    .limit(50)

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

        // "Ryd alle" - markerer samtlige ulæste notifikationer som læst.
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
    }),
})

export const {
    useGetMyNotificationsQuery,
    useMarkNotificationReadMutation,
    useMarkAllNotificationsReadMutation,
} = notificationApi