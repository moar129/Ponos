// src/store/hooks/useNavItems.ts
import { useNavigate } from 'react-router-dom'
import { BarChart3, ClipboardList, Database, Home, LayoutDashboard, LogIn, MessageSquareText, Newspaper } from 'lucide-react'
import { useGetSessionQuery, useSignOutMutation } from '../apis/authApi'
import { useGetMyProfileQuery } from '../apis/profileApi'
import {
    READ_DATALAYER_PRIVILEGE,
    READ_NEWS_PRIVILEGE,
    READ_STATISTICS_PRIVILEGE,
    READ_TASKS_PRIVILEGE,
    useHasPrivilege,
} from '../apis/privilegeApi'
import type { NavItem } from '../../types/common/navType'

// Appens hovednavigation - ÉN liste, som både headeren (desktop + mobil)
// og footeren viser. Før lå den tre steder, og footeren havde mistet
// privilegie-tjekket: den viste Opgaver/Statistik/Datalager/Nyheder for
// alle med en organisation.
//
// Opgaver/Statistik/Datalager/Nyheder/Beskeder giver kun mening med en
// aktiv organisation (US-45/US-56), og de fire første kræver desuden
// read_-privilegiet (Fase 3). Links skjules til profilen er hentet, så en
// bruger uden organisation aldrig ser links, der ikke virker for dem.
export function useNavItems(): { items: NavItem[]; isAuthenticated: boolean; isLoading: boolean } {
    const { data: session, isLoading: isLoadingSession } = useGetSessionQuery()
    const { hasOrganisation } = useHasOrganisation()
    const { hasPrivilege: canReadTasks } = useHasPrivilege(READ_TASKS_PRIVILEGE)
    const { hasPrivilege: canReadStatistics } = useHasPrivilege(READ_STATISTICS_PRIVILEGE)
    const { hasPrivilege: canReadDatalayer } = useHasPrivilege(READ_DATALAYER_PRIVILEGE)
    const { hasPrivilege: canReadNews } = useHasPrivilege(READ_NEWS_PRIVILEGE)

    const isAuthenticated = Boolean(session)
    if (!isAuthenticated) {
        return {
            isAuthenticated,
            isLoading: isLoadingSession,
            items: [
                { to: '/', labelKey: 'links.home', icon: Home },
                { to: '/login', labelKey: 'links.login', icon: LogIn },
            ],
        }
    }

    const orgItems: (NavItem & { visible: boolean })[] = [
        { to: '/tasks', labelKey: 'links.tasks', icon: ClipboardList, visible: canReadTasks },
        { to: '/statistik', labelKey: 'links.statistics', icon: BarChart3, visible: canReadStatistics },
        { to: '/datalager', labelKey: 'links.datalayer', icon: Database, visible: canReadDatalayer },
        { to: '/nyheder', labelKey: 'links.news', icon: Newspaper, visible: canReadNews },
        { to: '/beskeder', labelKey: 'links.messages', icon: MessageSquareText, visible: true },
    ]

    return {
        isAuthenticated,
        isLoading: false,
        items: [
            { to: '/dashboard', labelKey: 'links.dashboard', icon: LayoutDashboard },
            ...(hasOrganisation ? orgItems.filter((item) => item.visible) : []),
        ],
    }
}

/** Har den indloggede bruger en aktiv organisation? (false mens profilen hentes) */
export function useHasOrganisation(): { hasOrganisation: boolean; isLoading: boolean } {
    const { data: profile, isLoading } = useGetMyProfileQuery()
    return { hasOrganisation: !isLoading && Boolean(profile?.activeOrganisationId), isLoading }
}

/** Log ud og send brugeren til /login, så de ikke står på en beskyttet side. */
export function useSignOutAndRedirect(): { signOutAndRedirect: () => Promise<void>; signingOut: boolean } {
    const navigate = useNavigate()
    const [signOut, { isLoading: signingOut }] = useSignOutMutation()

    return {
        signingOut,
        signOutAndRedirect: async () => {
            // Auth-listeneren i authApi rydder selv cachen.
            await signOut()
            navigate('/login')
        },
    }
}
