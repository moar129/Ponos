// src/components/dashboard/NotificationsWidget.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { notificationBody, notificationTitle } from '../../utils/notificationDisplay'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
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
function useTimeAgo() {
    const { t } = useTranslation('dashboard')
    return (dateString: string): string => {
        const diffMs = Date.now() - new Date(dateString).getTime()
        const minutes = Math.floor(diffMs / 60000)
        if (minutes < 1) return t('notifications.justNow')
        if (minutes < 60) return t('notifications.minutesAgo', { count: minutes })
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return t('notifications.hoursAgo', { count: hours })
        return t('notifications.daysAgo', { count: Math.floor(hours / 24) })
    }
}


// US-72 (delvist): boardets egen visning af de 10 seneste notifikationer,
// med et Alle/Ulæst-faneskifte. Ulæst-antal og "Markér alle læst" er og
// forbliver klokkens ansvar (notificationBellComponent.tsx) - boardet er
// ren visning + filtrering. RLS ("Se egne notifikationer") afgrænser
// allerede queryen til den indloggede bruger.
export function NotificationsWidget() {
    const { t } = useTranslation(['dashboard', 'notifications'])
    const td = asDynamic(t)
    const timeAgo = useTimeAgo()
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
            : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
        }`

    return (
        <div className="rounded-lg border border-border-gray bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-secondary dark:text-slate-400" />
                        <h3 className="font-medium text-primary dark:text-slate-100">{t('notifications.title')}</h3>
                    </div>
                    <Link to="/notifikationer" className="flex items-center gap-1 text-sm text-accent hover:underline shrink-0">
                        {t('notifications.seeAll')}
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setFilter('all')} className={tabClass('all')}>
                        {t('notifications.all')}
                    </button>
                    <button type="button" onClick={() => setFilter('unread')} className={tabClass('unread')}>
                        {t('notifications.unread')}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <p className="text-sm text-secondary dark:text-slate-400">{t('notifications.loading')}</p>
            ) : errorMessage ? (
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            ) : visible.length === 0 ? (
                <p className="text-sm text-secondary dark:text-slate-400">
                    {filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty')}
                </p>
            ) : (
                <ul className="divide-y divide-border-gray dark:divide-slate-700">
                    {visible.map((notification) => (
                        <li key={notification.id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(notification)}
                                className="w-full text-left px-2 py-2.5 -mx-2 rounded-md transition-colors hover:bg-bg-gray/50 dark:hover:bg-slate-700/50"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-primary truncate dark:text-slate-100">{notificationTitle(notification, td)}</p>
                                    {!notification.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                                    )}
                                </div>
                                {notification.body && (
                                    <p className="text-sm text-secondary truncate mt-0.5 dark:text-slate-400">{notificationBody(notification, td)}</p>
                                )}
                                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{timeAgo(notification.createdAt)}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
