// src/store/hooks/useTimeAgo.ts
import { useTranslation } from 'react-i18next'

// "Lige nu" / "for 5 min siden" / "for 3 timer siden" / "for 2 dage siden".
// Delt af notifikationsklokken og dashboardets notifikations-widget.
export function useTimeAgo(): (dateString: string) => string {
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
