// src/components/notification/NotificationSummary.tsx
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { notificationBody, notificationTitle } from '../../utils/notificationDisplay'
import { useTimeAgo } from '../../store/hooks/useTimeAgo'
import type { AppNotification } from '../../types/notification/notificationTypes'

// Titel (+ ulæst-prik), tekst og "for 5 min siden" - indholdet af en
// notifikationsrække i klokken og på dashboardet. compact = klokkens
// mindre skrift.
export function NotificationSummary({ notification, compact = false }: { notification: AppNotification; compact?: boolean }) {
    const { t } = useTranslation('notifications')
    const td = asDynamic(t)
    const timeAgo = useTimeAgo()

    return (
        <>
            <div className="flex items-start justify-between gap-2">
                <p className={`${compact ? 'text-sm' : 'font-medium'} text-primary truncate dark:text-slate-100`}>
                    {notificationTitle(notification, td)}
                </p>
                {!notification.isRead && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
            </div>
            {notification.body && (
                <p className={`${compact ? 'text-xs' : 'text-sm'} text-secondary truncate mt-0.5 dark:text-slate-400`}>
                    {notificationBody(notification, td)}
                </p>
            )}
            <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-secondary mt-1 dark:text-slate-400`}>
                {timeAgo(notification.createdAt)}
            </p>
        </>
    )
}
