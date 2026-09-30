// src/components/dashboard/NotificationsWidget.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useGetMyNotificationsQuery } from '../../store/apis/notificationApi'
import { useOpenNotification } from '../../store/hooks/useOpenNotification'
import { NotificationSummary } from '../notification/NotificationSummary'
import { DashboardWidget, PillTabs } from './DashboardWidget'

const MAX_NOTIFICATIONS = 5

type NotificationFilter = 'all' | 'unread'

// US-72 (delvist): boardets egen visning af de seneste notifikationer,
// med et Alle/Ulæst-faneskifte. Ulæst-antal og "Markér alle læst" er og
// forbliver klokkens ansvar (notificationBellComponent.tsx) - boardet er
// ren visning + filtrering. RLS ("Se egne notifikationer") afgrænser
// allerede queryen til den indloggede bruger.
export function NotificationsWidget() {
    const { t } = useTranslation(['dashboard', 'notifications', 'common'])
    const openNotification = useOpenNotification()
    const [filter, setFilter] = useState<NotificationFilter>('all')
    const { data: notifications = [], isLoading, error } = useGetMyNotificationsQuery()

    const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
    const visible = filtered.slice(0, MAX_NOTIFICATIONS)
    const errorMessage = readableError(error)

    return (
        <DashboardWidget
            icon={<Bell className="w-5 h-5 text-secondary dark:text-slate-400" />}
            title={t('notifications.title')}
            link={{ to: '/notifikationer', label: t('notifications.seeAll') }}
            actions={
                <PillTabs
                    tabs={[
                        { key: 'all', label: t('common:all') },
                        { key: 'unread', label: t('notifications.unread') },
                    ]}
                    active={filter}
                    onSelect={setFilter}
                />
            }
        >
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
                                onClick={() => openNotification(notification)}
                                className="w-full text-left px-2 py-2.5 -mx-2 rounded-md transition-colors hover:bg-bg-gray/50 dark:hover:bg-slate-700/50"
                            >
                                <NotificationSummary notification={notification} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardWidget>
    )
}
