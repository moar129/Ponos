// src/components/dashboard/PlaceholderBar.tsx
import { useTranslation } from 'react-i18next'
import type { PlaceholderBarProps } from '../../types/dashboard/dashboardType'

// Fuld-bredde "kommer snart"-bjælke til Oversigt-fanen, brugt til
// funktioner uden data/backend endnu (pt. kun Notifikationer) - rent
// visuelt, ingen queries.
export function PlaceholderBar({ label, description, icon: Icon }: PlaceholderBarProps) {
    const { t } = useTranslation('dashboard')

    return (
        <div className="flex items-center gap-4 rounded-lg border border-dashed border-border-gray bg-bg-gray/40 p-5 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center shrink-0 dark:bg-slate-800">
                <Icon className="w-6 h-6 text-secondary dark:text-slate-400" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-medium text-primary dark:text-slate-100">{label}</p>
                    <span className="text-xs font-medium text-secondary bg-bg-gray rounded-full px-2 py-0.5 dark:text-slate-400 dark:bg-slate-700">
                        {t('comingSoon')}
                    </span>
                </div>
                <p className="text-sm text-secondary dark:text-slate-400">{description}</p>
            </div>
        </div>
    )
}
