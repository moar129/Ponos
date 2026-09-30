// src/components/dashboard/OrganisationHeader.tsx
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { OrganisationHeaderProps } from '../../types/organisation/organisationType'

// Organisationens ikon + navn øverst på Organisation-fanen og i
// Administration → Organisation.
export function OrganisationHeader({ name, isAdmin = false, subtitle }: OrganisationHeaderProps) {
    const { t } = useTranslation('organisation')

    return (
        <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-accent" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-primary dark:text-slate-100">{name}</h3>
                    {isAdmin && (
                        <span className="text-xs font-medium bg-accent/15 text-primary rounded-full px-2 py-0.5 dark:text-slate-100">
                            {t('details.administrator')}
                        </span>
                    )}
                </div>
                {subtitle && <p className="text-sm text-secondary dark:text-slate-400">{subtitle}</p>}
            </div>
        </div>
    )
}
