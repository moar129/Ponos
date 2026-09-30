// src/components/pendingRequestBanner/PendingRequestBanner.tsx
import type { ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useGetMyPendingRequestQuery } from '../../store/apis/membershipApi'
import { useGetMyPendingInvitationsQuery } from '../../store/apis/invitationApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { resolveDashboardTab } from '../../utils/dashboardTab'

// "Din anmodning til <org> afventer godkendelse" - også vist inde på
// dashboardets Organisation-fane.
export function PendingRequestMessage({ organisationName }: { organisationName: string }) {
    return (
        <Trans
            ns="nav"
            i18nKey="banner.pendingRequest"
            values={{ organisation: organisationName }}
            components={{ strong: <strong /> }}
        />
    )
}

function Banner({ children }: { children: ReactNode }) {
    return (
        <div className="w-full bg-accent/15 border-b border-accent text-primary dark:text-slate-100 text-sm text-center px-4 py-2">
            {children}
        </div>
    )
}

// Viser en banner under navbaren med brugerens medlemskabs-tilstand:
// egen ventende anmodning, ellers en ventende invitation (US-67), ellers
// - for en bruger uden organisation og uden nogen af delene - en genvej
// til at anmode. Henter data via RTK Query i stedet for Redux-slice, så
// komponenten virker uanset hvilken side brugeren er på.
export default function PendingRequestBanner() {
    const { t } = useTranslation('nav')
    const { pathname } = useLocation()
    const [searchParams] = useSearchParams()
    const { data: pendingRequest, isLoading: loadingRequest } = useGetMyPendingRequestQuery()
    const { data: pendingInvitations, isLoading: loadingInvitations } = useGetMyPendingInvitationsQuery()
    const { data: profile, isLoading: loadingProfile } = useGetMyProfileQuery()

    if (loadingRequest || loadingInvitations || loadingProfile) {
        return null
    }

    if (pendingRequest) {
        return (
            <Banner>
                <PendingRequestMessage organisationName={pendingRequest.organisationName} />
            </Banner>
        )
    }

    if (!profile) {
        return null
    }

    // Invitationen/opfordringen står i forvejen på dashboardets
    // Organisation-fane - så ingen banner, mens den er åben.
    const hasOrganisation = Boolean(profile.activeOrganisationId)
    const onDashboardOrganisationTab =
        pathname === '/dashboard' && resolveDashboardTab(searchParams.get('tab'), hasOrganisation) === 'organisation'

    const [firstInvitation] = pendingInvitations ?? []
    if (firstInvitation && !onDashboardOrganisationTab) {
        return (
            <Banner>
                <Trans
                    ns="nav"
                    i18nKey="banner.invited"
                    values={{ organisation: firstInvitation.organisationName }}
                    components={{ strong: <strong /> }}
                />{' '}
                <Link to="/dashboard?tab=organisation" className="font-semibold underline hover:no-underline">
                    {t('banner.seeInvitation')}
                </Link>
            </Banner>
        )
    }

    if (hasOrganisation || onDashboardOrganisationTab) {
        return null
    }

    return (
        <Banner>
            {t('banner.noOrganisation')}{' '}
            <Link to="/dashboard?tab=organisation" className="font-semibold underline hover:no-underline">
                {t('banner.createOrRequest')}
            </Link>
        </Banner>
    )
}
