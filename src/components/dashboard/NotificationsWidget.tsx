// src/components/dashboard/NotificationsWidget.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import {
    useGetMyNotificationsQuery,
    useMarkNotificationReadMutation,
} from '../../store/apis/notificationApi'
import type { AppNotification } from '../../types/notification/notificationTypes'

const MAX_NOTIFICATIONS = 5

type NotificationFilter = 'all' | 'unread'

// Duplikeret fra notificationBellComponent.tsx (samme grund som
// MyTasksWidget's sortByPriorityThenEndDate) - undgår at trække delt kode
// ud af en anden fils komponent for en enkelt lille helper.
function timeAgo(dateString: string): string {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'Lige nu'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} t`
    const days = Math.floor(hours / 24)
    return `${days} d`
}

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// US-72 (delvist): boardets egen visning af de 10 seneste notifikationer,
// med et Alle/Ulæst-faneskifte. Ulæst-antal og "Markér alle læst" er og
// forbliver klokkens ansvar (notificationBellComponent.tsx) - boardet er
// ren visning + filtrering. RLS ("Se egne notifikationer") afgrænser
// allerede queryen til den indloggede bruger.
export function NotificationsWidget() {
    const navigate = useNavigate()
    const [filter, setFilter] = useState<NotificationFilter>('all')
    const { data: notifications = [], isLoading, error } = useGetMyNotificationsQuery()
    const [markRead] = useMarkNotificationReadMutation()

    const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
    const visible = filtered.slice(0, MAX_NOTIFICATIONS)
    const errorMessage = readableError(error)

    const handleSelect = async (notification: AppNotification) => {
        if (!notification.isRead) {
            await markRead({ id: notification.id })
        }
        if (notification.link) {
            navigate(notification.link)
        }
    }

    const tabClass = (tab: NotificationFilter) =>
        `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === tab
            ? 'bg-accent/10 text-accent'
            : 'text-secondary hover:text-primary'
        }`

    return (
        <div className="rounded-lg border border-border-gray bg-white p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-secondary" />
                    <h3 className="font-medium text-primary">Notifikationer</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setFilter('all')} className={tabClass('all')}>
                        Alle
                    </button>
                    <button type="button" onClick={() => setFilter('unread')} className={tabClass('unread')}>
                        Ulæst
                    </button>
                </div>
            </div>

            {isLoading ? (
                <p className="text-sm text-secondary">Indlæser notifikationer...</p>
            ) : errorMessage ? (
                <p className="text-sm text-red-600">{errorMessage}</p>
            ) : visible.length === 0 ? (
                <p className="text-sm text-secondary">
                    {filter === 'unread' ? 'Ingen ulæste notifikationer.' : 'Ingen notifikationer endnu.'}
                </p>
            ) : (
                <ul className="divide-y divide-border-gray">
                    {visible.map((notification) => (
                        <li key={notification.id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(notification)}
                                className="w-full text-left px-2 py-2.5 -mx-2 rounded-md transition-colors hover:bg-bg-gray/50"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-primary truncate">{notification.title}</p>
                                    {!notification.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                                    )}
                                </div>
                                {notification.body && (
                                    <p className="text-sm text-secondary truncate mt-0.5">{notification.body}</p>
                                )}
                                <p className="text-xs text-secondary mt-1">{timeAgo(notification.createdAt)}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
