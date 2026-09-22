// src/components/dashboard/organisationPickerComponent.tsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search } from 'lucide-react'
import type { OrganisationPickerComponentProps } from '../../types/organisation/organisationType'

// Søgbar erstatning for en native <select> til "Anmod om medlemskab"
// (US-05) - en flad liste bliver uoverskuelig at scrolle igennem, når
// antallet af organisationer vokser. Samme visuelle skal (søgefelt +
// scrollbar resultatliste) som kontakt-søgningen i
// contactListComponent.tsx/createGroupComponent.tsx, men enkelt-valg.
export function OrganisationPickerComponent({
    organisations,
    isLoading,
    value,
    onChange,
}: OrganisationPickerComponentProps) {
    const { t } = useTranslation('organisation')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredOrganisations = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return organisations
        return organisations.filter((org) => org.name.toLowerCase().includes(q))
    }, [organisations, searchQuery])

    return (
        <div>
            <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
                <input
                    type="text"
                    placeholder={t('picker.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
            </div>

            <div className="border border-border-gray rounded-lg max-h-56 overflow-y-auto dark:border-slate-700">
                {isLoading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    </div>
                ) : filteredOrganisations.length === 0 ? (
                    <p className="text-sm text-secondary text-center py-6 dark:text-slate-400">
                        {organisations.length === 0
                            ? t('picker.empty')
                            : t('picker.noMatch')}
                    </p>
                ) : (
                    <ul className="divide-y divide-border-gray dark:divide-slate-700">
                        {filteredOrganisations.map((org) => (
                            <li key={org.id}>
                                <button
                                    type="button"
                                    onClick={() => onChange(org.id)}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                        value === org.id
                                            ? 'bg-accent/10 text-primary font-medium dark:text-slate-100'
                                            : 'text-primary hover:bg-bg-gray/50 dark:text-slate-100 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {org.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
