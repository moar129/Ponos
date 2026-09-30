// src/store/hooks/useDisplayName.ts
import { useTranslation } from 'react-i18next'

// Navn til visning - "Ukendt bruger" (oversat) når API'et ikke kunne slå
// personen op. API'et returnerer bevidst '' i stedet for en dansk tekst,
// så fallbacken følger det valgte sprog.
export function useDisplayName(): (name: string | null | undefined) => string {
    const { t } = useTranslation('tasks')
    return (name) => name || t('assignees.unknownUser')
}
