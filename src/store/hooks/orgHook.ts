// src/store/hooks/orgHook.ts
import { useEffect } from 'react'
import { useGetMyOrganisationQuery } from '../apis/organisationApi'
import { useAppSelector } from './hooks'
import { buildOrgPalette, paletteToCssVars } from '../../utils/orgPalette'

// Sets the organisation's branding colors (OrganisationColorsPanel.tsx) as CSS
// variables on <html>, so Tailwind's bg-accent/text-accent/header/footer
// classes (defined via var() in index.css) follow the organisation. Colors are
// derived per theme mode, so any chosen color stays readable in both light and
// dark mode. Falls back to Ponos' defaults when nothing is chosen.
export function useOrganisationTheme() {
    const { data: organisation } = useGetMyOrganisationQuery()
    const mode = useAppSelector((state) => state.theme.mode)

    useEffect(() => {
        const root = document.documentElement
        for (const [name, value] of Object.entries(paletteToCssVars(buildOrgPalette(organisation, mode)))) {
            root.style.setProperty(name, value)
        }
    }, [organisation, mode])
}
