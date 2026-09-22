// src/components/dashboard/OrganisationTab.tsx
import { readableError } from '../../ErrorMessage';
import { Trans, useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, Handshake, Plus, Send, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useGetMyOrganisationQuery,
    useGetOrganisationsQuery,
    useLeaveOrganisationMutation,
    useSetActiveOrganisationMutation,
} from '../../store/apis/organisationApi'
import { useGetMyPendingRequestQuery, useRequestMembershipMutation } from '../../store/apis/membershipApi'
import { formatDate } from '../../utils/formatDate'
import { useGetMyPendingInvitationsQuery, useRespondToInvitationMutation } from '../../store/apis/invitationApi'
import { OrganisationPickerComponent } from './organisationPickerComponent'
import type {
    CreateOrganisationSectionProps,
    MembershipRowProps,
    MyMembership,
    Organisation,
} from '../../types/organisation/organisationType'
import type { InvitationRowProps, RespondInvitationInput } from '../../types/membership/membershipType'

type NoOrgTab = 'create' | 'request' | 'memberships' | 'invitations'

// Samme vertikale sidebar-nav-stil som AdministrationTab.tsx, genbrugt
// her for et konsistent udtryk på tværs af dashboardets faner.
function orgNavItemClass(active: boolean): string {
    return `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${active
        ? 'bg-accent/15 text-primary dark:text-slate-100'
        : 'text-secondary hover:bg-bg-gray hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
    }`
}

type OrgTab = 'details' | 'memberships' | 'request' | 'create' | 'invitations'

// Se organisation, skifte/forlade medlemskaber, samt anmode om/oprette
// organisationer - flyttet fra OrganisationPage.tsx (`/organisation`) ind
// i dashboardets Organisation-fane (US-65), tilgængelig for alle
// brugere (ikke privilegie-gated, i modsætning til Administration-
// fanen). Rediger/slet organisation ligger i Administration-fanen (se
// OrganisationAdminPanel.tsx).
//
// "Organisation"-underfanen (navn, admin-badge, medlemsantal) vises for
// alle medlemmer af den aktive organisation, ikke kun administratorer.
//
// Bruger uden organisation: samme fane tilbyder både "Opret organisation"
// (US-58) og "Anmod om medlemskab" (US-05) som to underfaner, da det er
// de to eneste veje ind i en organisation, og brugeren ellers selv
// skulle vide/finde den anden vej.
export function OrganisationTab() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    // Bruges også når organisation er null: en bruger uden aktiv
    // organisation kan stadig have andre medlemskaber (fx pga. en bug som
    // dem der ramte delete_organisation/leave_organisation - de glemte at
    // sætte en ny aktiv org) - uden dette opslag var der ingen vej tilbage
    // til "Mine organisationer" udover at oprette en helt ny organisation.
    const { data: memberships } = useGetMyMembershipsQuery()
    const [createOrganisation, { isLoading: creating, error: createError }] = useCreateOrganisationMutation()
    const [requestMembership, { isLoading: requesting, error: requestError }] = useRequestMembershipMutation()
    const { data: pendingRequest, isLoading: loadingPendingRequest } = useGetMyPendingRequestQuery()
    // US-67: invitationer andre organisationer har sendt til MIG - vises
    // som en betinget underfane (samme mønster som "Mine organisationer"),
    // både i no-org- og has-org-visningen.
    const { data: pendingInvitations } = useGetMyPendingInvitationsQuery()

    const [noOrgTab, setNoOrgTab] = useState<NoOrgTab>('create')
    const [orgTab, setOrgTab] = useState<OrgTab>('details')
    // Vises på "Organisation"-underfanen lige efter man har oprettet en
    // ny organisation fra "Opret organisation"-underfanen (US-60) -
    // ryddes, når brugeren selv skifter fane igen, så den ikke bliver
    // hængende.
    const [createdOrgName, setCreatedOrgName] = useState<string | null>(null)

    function switchOrgTab(tab: OrgTab) {
        setCreatedOrgName(null)
        setOrgTab(tab)
    }

    function handleOrganisationCreated(name: string) {
        setCreatedOrgName(name)
        setOrgTab('details')
    }

    const [createName, setCreateName] = useState('')
    const [createValidationError, setCreateValidationError] = useState<string | null>(null)

    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [requestSuccess, setRequestSuccess] = useState(false)

    // Henter listen af organisationer man kan anmode om medlemskab af, kun
    // relevant for brugere uden egen organisation - undgår et unødvendigt
    // kald for brugere der allerede er medlem et sted.
    const { data: organisations = [], isLoading: loadingOrganisations } = useGetOrganisationsQuery(undefined, {
        skip: isLoading || !!organisation,
    })

    async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!createName.trim()) {
            setCreateValidationError(t('errors:required.organisationName'))
            return
        }
        setCreateValidationError(null)

        try {
            await createOrganisation({ name: createName.trim() }).unwrap()

            // Mutationen invaliderer 'Organisation', så visningen nedenfor
            // henter og viser den nye organisation automatisk.
            setCreateName('')
        } catch {
            // Fejlen vises via createError - feltets indhold bevares.
        }
    }

    async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        try {
            await requestMembership({ organisationId: selectedOrgId }).unwrap()

            // Mutationen invaliderer 'PendingRequest', så banneret og
            // pendingRequest herunder opdaterer sig selv.
            setRequestSuccess(true)
        } catch {
            // Fejlen vises via requestError.
        }
    }

    if (isLoading || loadingPendingRequest) {
        return <p className="text-secondary dark:text-slate-400">{t('loading')}</p>
    }

    if (queryError) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                {readableError(queryError)}
            </div>
        )
    }

    if (!organisation) {
        const createErrorMessage = readableError(createError)
        const requestErrorMessage = readableError(requestError)
        const hasOtherMemberships = (memberships?.length ?? 0) > 0

        return (
            <div>
                <h2 className="text-lg font-semibold text-primary mb-2 dark:text-slate-100">{t('noActiveTitle')}</h2>
                <p className="text-sm text-secondary mb-6 dark:text-slate-400">
                    {hasOtherMemberships
                        ? t('noActiveWithMemberships')
                        : t('noActiveWithout')}
                </p>

                {pendingRequest ? (
                    <div className="rounded-md bg-accent/15 border border-accent text-primary text-sm px-3 py-2 dark:text-slate-100">
                        <Trans ns="nav" i18nKey="banner.pendingRequest" values={{ organisation: pendingRequest.organisationName }} components={{ strong: <strong /> }} />
                    </div>
                ) : (
                    (() => {
                        const noOrgTabDefs: { key: NoOrgTab; label: string; icon: LucideIcon }[] = [
                            { key: 'create', label: t('tabs.create'), icon: Plus },
                            { key: 'request', label: t('tabs.request'), icon: Handshake },
                            ...(hasOtherMemberships
                                ? [{ key: 'memberships' as NoOrgTab, label: t('tabs.memberships'), icon: Users }]
                                : []),
                            ...((pendingInvitations?.length ?? 0) > 0
                                ? [{ key: 'invitations' as NoOrgTab, label: `Invitationer (${pendingInvitations?.length})`, icon: Send }]
                                : []),
                        ]

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                                <nav className="md:col-span-4 lg:col-span-4 xl:col-span-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar rounded-lg border border-border-gray bg-white p-2 md:p-3 dark:border-slate-700 dark:bg-slate-800">
                                    {noOrgTabDefs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setNoOrgTab(tab.key)}
                                            className={orgNavItemClass(noOrgTab === tab.key)}
                                        >
                                            <tab.icon className="w-4 h-4 shrink-0" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>

                                <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 min-w-0 rounded-lg border border-border-gray bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
                                    {noOrgTab === 'memberships' ? (
                                        <MyMembershipsSection />
                                    ) : noOrgTab === 'invitations' ? (
                                        <InvitationsSection />
                                    ) : noOrgTab === 'create' ? (
                                        <>
                                            {(createValidationError || createErrorMessage) && (
                                                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                                                    {createValidationError ?? createErrorMessage}
                                                </div>
                                            )}
                                            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                                                <div>
                                                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="create-name">{t('create.nameLabel')}</label>
                                                    <input
                                                        id="create-name"
                                                        type="text"
                                                        value={createName}
                                                        onChange={(e) => setCreateName(e.target.value)}
                                                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={creating}
                                                    className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                                                >
                                                    {creating ? t('create.submitting') : t('create.submit')}
                                                </button>
                                            </form>
                                        </>
                                    ) : requestSuccess ? (
                                        <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                                            {t('request.pending')}
                                        </div>
                                    ) : (
                                        <>
                                            {requestErrorMessage && (
                                                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                                                    {requestErrorMessage}
                                                </div>
                                            )}
                                            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                                                <div>
                                                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400">{t('request.chooseLabel')}</label>
                                                    <OrganisationPickerComponent
                                                        organisations={organisations}
                                                        isLoading={loadingOrganisations}
                                                        value={selectedOrgId}
                                                        onChange={setSelectedOrgId}
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={requesting || !selectedOrgId}
                                                    className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                                                >
                                                    {requesting ? t('request.submitting') : t('request.submit')}
                                                </button>
                                            </form>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })()
                )}
            </div>
        )
    }

    // Bruges til at vise antal medlemmer + rolle-badge på "Organisation"-
    // underfanen nedenfor - allerede hentet ovenfor til no-org-grenen.
    const activeMembership = memberships?.find((m) => m.isActive) ?? null

    // "Organisation" (navn/badge/medlemsantal) er synlig for alle
    // medlemmer af den aktive organisation, ligesom de øvrige faner.
    const orgTabDefs: { key: OrgTab; label: string; icon: LucideIcon }[] = [
        { key: 'details', label: 'Organisation', icon: Building2 },
        { key: 'memberships', label: t('tabs.memberships'), icon: Users },
        { key: 'request', label: t('tabs.request'), icon: Handshake },
        { key: 'create', label: t('tabs.create'), icon: Plus },
        ...((pendingInvitations?.length ?? 0) > 0
            ? [{ key: 'invitations' as OrgTab, label: `Invitationer (${pendingInvitations?.length})`, icon: Send }]
            : []),
    ]
    const effectiveOrgTab: OrgTab = orgTabDefs.some((tab) => tab.key === orgTab) ? orgTab : orgTabDefs[0].key

    return (
        // US-59: en bruger kan være medlem af flere organisationer -
        // "Mine organisationer" viser dem alle og lader brugeren skifte
        // hvilken der er aktiv. Samme 12-kolonne grid-layout som
        // AdministrationTab.tsx og DataLayerPage.tsx (Kategorier/Items-
        // splittet), for et konsistent udtryk på tværs af appen.
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
            <nav className="md:col-span-4 lg:col-span-4 xl:col-span-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar rounded-lg border border-border-gray bg-white p-2 md:p-3 dark:border-slate-700 dark:bg-slate-800">
                {orgTabDefs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => switchOrgTab(tab.key)}
                        className={orgNavItemClass(effectiveOrgTab === tab.key)}
                    >
                        <tab.icon className="w-4 h-4 shrink-0" />
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 min-w-0 rounded-lg border border-border-gray bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
                {effectiveOrgTab === 'memberships' ? (
                    <MyMembershipsSection />
                ) : effectiveOrgTab === 'request' ? (
                    <RequestMembershipSection />
                ) : effectiveOrgTab === 'create' ? (
                    <CreateOrganisationSection onCreated={handleOrganisationCreated} />
                ) : effectiveOrgTab === 'invitations' ? (
                    <InvitationsSection />
                ) : (
                    <>
                        {createdOrgName && (
                            <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                                {t('create.created', { name: createdOrgName })}
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-bg-gray flex items-center justify-center shrink-0 dark:bg-slate-800">
                                <Building2 className="w-7 h-7 text-secondary dark:text-slate-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-primary dark:text-slate-100">{organisation.name}</h3>
                                    {activeMembership?.isAdmin && (
                                        <span className="text-xs font-medium bg-accent/15 text-primary rounded-full px-2 py-0.5 dark:text-slate-100">
                                            {t('details.administrator')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-secondary dark:text-slate-400">{activeMembership?.roleName ?? t('details.noRole')}</p>
                            </div>
                        </div>

                        <dl className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                            <div className="py-3 flex justify-between gap-4">
                                <dt className="text-sm text-secondary dark:text-slate-400">{t('details.memberCount')}</dt>
                                <dd className="text-sm text-right">{activeMembership?.memberCount ?? '—'}</dd>
                            </div>
                        </dl>
                    </>
                )}
            </div>
        </div>
    )
}


// US-67: invitationer andre organisationer har sendt til den indloggede
// bruger. Samme accepter/afvis-bekræft-mønster som RequestRow i
// MembershipRequestsPanel.tsx (admin-siden af den anden retning).
function InvitationsSection() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: invitations, isLoading, error: queryError } = useGetMyPendingInvitationsQuery()
    const [respondToInvitation, { isLoading: submitting, error: mutationError }] = useRespondToInvitationMutation()

    const [pendingDecision, setPendingDecision] = useState<RespondInvitationInput | null>(null)

    async function confirmDecision(decision: RespondInvitationInput) {
        try {
            await respondToInvitation(decision).unwrap()
            setPendingDecision(null)
        } catch {
            setPendingDecision(null)
        }
    }

    const listError = readableError(queryError)
    const actionError = readableError(mutationError)

    return (
        <div>
            {(listError || actionError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {listError ?? actionError}
                </div>
            )}

            {isLoading ? (
                <p className="text-secondary dark:text-slate-400">{t('myInvitations.loading')}</p>
            ) : !invitations || invitations.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('myInvitations.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="py-4">
                            <InvitationRow
                                invitation={invitation}
                                pendingDecision={pendingDecision}
                                submitting={submitting}
                                onSelect={setPendingDecision}
                                onCancel={() => setPendingDecision(null)}
                                onConfirm={confirmDecision}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// Én invitation: enten organisationsnavn + de to knapper, eller - hvis
// netop denne række afventer bekræftelse - en "er du sikker?"-boks.
function InvitationRow({ invitation, pendingDecision, submitting, onSelect, onCancel, onConfirm }: InvitationRowProps) {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const decision = pendingDecision?.invitationId === invitation.id ? pendingDecision : null

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-medium">{invitation.organisationName}</p>
                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{t('myInvitations.invitedOnDate', { date: formatDate(invitation.invitedAt) })}</p>
            </div>

            {decision ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-secondary max-w-xs dark:text-slate-400">
                        {decision.decision === 'Accepted'
                            ? t('myInvitations.confirmAccept', { name: invitation.organisationName })
                            : t('myInvitations.confirmReject')}
                    </p>
                    <button
                        type="button"
                        onClick={() => onConfirm(decision)}
                        disabled={submitting}
                        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {submitting ? t('myInvitations.processing') : t('myInvitations.yes')}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-border-gray bg-bg-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    >
                        {t('common:cancel')}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onSelect({ invitationId: invitation.id, decision: 'Accepted' })}
                        disabled={submitting}
                        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {t('myInvitations.accept')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelect({ invitationId: invitation.id, decision: 'Rejected' })}
                        disabled={submitting}
                        className="rounded-md border border-border-gray bg-bg-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    >
                        {t('myInvitations.reject')}
                    </button>
                </div>
            )}
        </div>
    )
}

// US-59: en bruger, der allerede har en aktiv organisation, kan stadig
// anmode om medlemskab af en ANDEN organisation (kun oprettelse af en 2.
// organisation er blokeret her - det er US-60's opgave at løsne). Egen
// komponent (frem for at genbruge "ingen organisation"-visningens
// indlejrede formular) for ikke at røre ved den allerede testede
// no-org-flig ovenfor.
function RequestMembershipSection() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: pendingRequest, isLoading: loadingPendingRequest } = useGetMyPendingRequestQuery()
    const { data: memberships } = useGetMyMembershipsQuery()
    const [requestMembership, { isLoading: requesting, error: requestError }] = useRequestMembershipMutation()

    const { data: organisations = [], isLoading: loadingOrganisations } = useGetOrganisationsQuery()
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [requestSuccess, setRequestSuccess] = useState(false)

    async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        try {
            await requestMembership({ organisationId: selectedOrgId }).unwrap()
            setRequestSuccess(true)
        } catch {
            // Fejlen vises via requestError.
        }
    }

    if (loadingPendingRequest) {
        return <p className="text-secondary dark:text-slate-400">{t('genericLoading')}</p>
    }

    if (pendingRequest) {
        return (
            <div className="rounded-md bg-accent/15 border border-accent text-primary text-sm px-3 py-2 dark:text-slate-100">
                <Trans ns="nav" i18nKey="banner.pendingRequest" values={{ organisation: pendingRequest.organisationName }} components={{ strong: <strong /> }} />
            </div>
        )
    }

    if (requestSuccess) {
        return (
            <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                        {t('request.pending')}
            </div>
        )
    }

    // Organisationer brugeren allerede er medlem af, skal ikke tilbydes -
    // relevant her, da brugeren (i modsætning til no-org-fligen) allerede
    // kan have medlemskaber.
    const myOrgIds = new Set((memberships ?? []).map((membership) => membership.organisationId))
    const availableOrganisations = organisations.filter((org) => !myOrgIds.has(org.id))

    const requestErrorMessage = readableError(requestError)

    return (
        <>
            {requestErrorMessage && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {requestErrorMessage}
                </div>
            )}

            {!loadingOrganisations && availableOrganisations.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('request.noneAvailable')}</p>
            ) : (
                <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-secondary mb-1 dark:text-slate-400">{t('request.chooseLabel')}</label>
                        <OrganisationPickerComponent
                            organisations={availableOrganisations}
                            isLoading={loadingOrganisations}
                            value={selectedOrgId}
                            onChange={setSelectedOrgId}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={requesting || !selectedOrgId}
                        className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {requesting ? t('request.submitting') : t('request.submit')}
                    </button>
                </form>
            )}
        </>
    )
}

// US-60: en bruger, der allerede har en aktiv organisation, kan oprette
// endnu en (bliver automatisk admin i den, ved siden af eksisterende
// medlemskaber). Egen komponent af samme grund som
// RequestMembershipSection ovenfor.
function CreateOrganisationSection({ onCreated }: CreateOrganisationSectionProps) {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const [createOrganisation, { isLoading: creating, error: createError }] = useCreateOrganisationMutation()

    const [createName, setCreateName] = useState('')
    const [createValidationError, setCreateValidationError] = useState<string | null>(null)

    async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const trimmed = createName.trim()
        if (!trimmed) {
            setCreateValidationError(t('errors:required.organisationName'))
            return
        }
        setCreateValidationError(null)

        try {
            await createOrganisation({ name: trimmed }).unwrap()
            setCreateName('')
            onCreated(trimmed)
        } catch {
            // Fejlen vises via createError.
        }
    }

    const createErrorMessage = readableError(createError)

    return (
        <>
            {(createValidationError || createErrorMessage) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {createValidationError ?? createErrorMessage}
                </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="create-name-existing">{t('create.nameLabel')}</label>
                    <input
                        id="create-name-existing"
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={creating}
                    className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {creating ? t('create.submitting') : t('create.submit')}
                </button>
            </form>
        </>
    )
}

// "Mine organisationer" (US-59/US-61): liste over alle brugerens
// medlemskaber, med mulighed for at skifte hvilken der er aktiv, og for
// at forlade en organisation. Ligger som en underfane sammen med
// organisationsdetaljer, i stedet for en separat side - det er begge
// dele "min tilknytning til organisationer".
function MyMembershipsSection() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: memberships, isLoading, error: queryError } = useGetMyMembershipsQuery()
    // Vises efter et vellykket "Forlad" - løftet op hertil (frem for at
    // ligge i selve rækken) fordi rækken forsvinder fra listen, så snart
    // 'Membership' invalideres og listen henter frisk data igen - en
    // besked i selve rækken ville derfor aldrig nå at blive vist.
    const [actionMessage, setActionMessage] = useState<string | null>(null)

    function handleLeft(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        if (!wasActive) {
            setActionMessage(t('myOrganisations.left', { name: organisationName }))
        } else if (newActiveOrganisation) {
            setActionMessage(t('myOrganisations.leftNewActive', { name: organisationName, newActive: newActiveOrganisation.name }))
        } else {
            setActionMessage(t('myOrganisations.leftNoActive', { name: organisationName }))
        }
    }

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('myOrganisations.loading')}</p>
    }

    const listError = readableError(queryError)
    if (listError) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                {listError}
            </div>
        )
    }

    if (!memberships || memberships.length === 0) {
        return <p className="text-secondary dark:text-slate-400">{t('myOrganisations.empty')}</p>
    }

    return (
        <div>
            {actionMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
                    {actionMessage}
                </div>
            )}

            <ul className="divide-y divide-border-gray border-t border-border-gray">
                {memberships.map((membership: MyMembership) => (
                    <MembershipRow
                        key={membership.organisationId}
                        membership={membership}
                        onLeft={handleLeft}
                    />
                ))}
            </ul>
        </div>
    )
}

function MembershipRow({ membership, onLeft }: MembershipRowProps) {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const [setActiveOrganisation, { isLoading: switching, error: switchError }] = useSetActiveOrganisationMutation()
    const [leaveOrganisation, { isLoading: leaving, error: leaveError }] = useLeaveOrganisationMutation()

    const [confirmingLeave, setConfirmingLeave] = useState(false)

    async function handleSwitch() {
        try {
            await setActiveOrganisation({ organisationId: membership.organisationId }).unwrap()
        } catch {
            // Fejlen vises via switchError.
        }
    }

    async function handleLeave() {
        try {
            const newActiveOrganisation = await leaveOrganisation({ organisationId: membership.organisationId }).unwrap()
            onLeft(membership.organisationName, membership.isActive, newActiveOrganisation)
        } catch {
            // Fejlen vises via leaveError - forbliver i bekræft-tilstand.
        }
    }

    const actionError = readableError(switchError) ?? readableError(leaveError)

    return (
        <li className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="font-medium">{membership.organisationName}</p>
                    <p className="text-sm text-secondary dark:text-slate-400">{membership.roleName ?? t('details.noRole')}</p>
                </div>

                <div className="flex items-center gap-2">
                    {membership.isActive ? (
                        <span className="text-sm font-medium text-accent">{t('myOrganisations.active')}</span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSwitch}
                            disabled={switching}
                            className="rounded-md border border-border-gray bg-bg-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray/70 transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                        >
                            {switching ? t('myOrganisations.switching') : t('myOrganisations.makeActive')}
                        </button>
                    )}

                    {confirmingLeave ? (
                        <>
                            <span className="text-sm text-secondary dark:text-slate-400">{t('myOrganisations.areYouSure')}</span>
                            <button
                                type="button"
                                onClick={handleLeave}
                                disabled={leaving}
                                className="text-red-600 text-sm font-medium hover:underline disabled:opacity-60 dark:text-red-400"
                            >
                                {leaving ? t('myOrganisations.leaving') : t('myOrganisations.confirmLeaveYes')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingLeave(false)}
                                disabled={leaving}
                                className="text-secondary text-sm hover:underline disabled:opacity-60 dark:text-slate-400"
                            >
                                {t('common:cancel')}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmingLeave(true)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                            {t('myOrganisations.leave')}
                        </button>
                    )}
                </div>
            </div>

            {actionError && <p className="text-red-600 text-xs mt-2 dark:text-red-400">{actionError}</p>}
        </li>
    )
}
