// src/components/dashboard/organisationPickerComponent.tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search } from 'lucide-react'
import { readableError } from '../../ErrorMessage'
import { useSearchOrganisationsQuery } from '../../store/apis/organisationApi'
import type { OrganisationPickerComponentProps } from '../../types/organisation/organisationType'

const MIN_SEARCH_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 300

// Søgbar erstatning for en native <select> til "Anmod om medlemskab"
// (US-05). Viser intet før der er skrevet mindst MIN_SEARCH_LENGTH tegn,
// og søger server-side (searchOrganisations), så hverken listen eller
// kaldet vokser med antallet af organisationer. Samme visuelle skal
// (søgefelt + scrollbar resultatliste) som kontakt-søgningen i
// contactListComponent.tsx/createGroupComponent.tsx, men enkelt-valg.
export function OrganisationPickerComponent({
    value,
    onChange,
    excludeIds = [],
}: OrganisationPickerComponentProps) {
    const { t } = useTranslation('organisation')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedTerm, setDebouncedTerm] = useState('')

    const term = searchQuery.trim()

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedTerm(term), SEARCH_DEBOUNCE_MS)
        return () => clearTimeout(timeout)
    }, [term])

    const tooShort = term.length < MIN_SEARCH_LENGTH
    const { data: organisations = [], isFetching, error } = useSearchOrganisationsQuery(debouncedTerm, {
        skip: debouncedTerm.length < MIN_SEARCH_LENGTH,
    })
    const searching = isFetching || term !== debouncedTerm
    const results = organisations.filter((org) => !excludeIds.includes(org.id))
    const errorMessage = readableError(error)

    function handleSearchChange(nextQuery: string) {
        setSearchQuery(nextQuery)
        // Nulstil valget, så en organisation der ikke længere er synlig i
        // resultatlisten ikke kan sendes afsted.
        if (value) onChange('')
    }

    return (
        <div>
            <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
                <input
                    type="text"
                    placeholder={t('picker.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
            </div>

            <div className="border border-border-gray rounded-lg max-h-56 overflow-y-auto dark:border-slate-700">
                {tooShort ? (
                    <p className="text-sm text-secondary text-center py-6 dark:text-slate-400">
                        {t('picker.minChars')}
                    </p>
                ) : searching ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    </div>
                ) : errorMessage ? (
                    <p className="text-sm text-red-600 text-center py-6 dark:text-red-400">{errorMessage}</p>
                ) : results.length === 0 ? (
                    <p className="text-sm text-secondary text-center py-6 dark:text-slate-400">
                        {t('picker.noMatch')}
                    </p>
                ) : (
                    <ul className="divide-y divide-border-gray dark:divide-slate-700">
                        {results.map((org) => (
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
