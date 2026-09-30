// src/store/hooks/useOpenNotification.ts
import { useNavigate } from 'react-router-dom'
import { useMarkNotificationReadMutation } from '../apis/notificationApi'
import type { AppNotification } from '../../types/notification/notificationTypes'

// Klik på en notifikation: markér den læst og følg dens link. Delt af
// klokken, dashboard-widget'en og /notifikationer.
export function useOpenNotification(): (notification: AppNotification) => Promise<void> {
    const navigate = useNavigate()
    const [markRead] = useMarkNotificationReadMutation()

    return async (notification) => {
        if (!notification.isRead) {
            await markRead({ id: notification.id })
        }
        if (notification.link) {
            navigate(notification.link)
        }
    }
}
