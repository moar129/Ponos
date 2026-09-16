// src/components/dashboard/OrganisationTab.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, Handshake, Plus, Send, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useGetMyOrganisationQuery,
    useLeaveOrganisationMutation,
    useSetActiveOrganisationMutation,
} from '../../store/apis/organisationApi'
import { useGetMyPendingRequestQuery, useRequestMembershipMutation } from '../../store/apis/membershipApi'
import { useGetMyPendingInvitationsQuery, useRespondToInvitationMutation } from '../../store/apis/invitationApi'
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
        ? 'bg-accent/15 text-accent'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`
}

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableApiError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

type OrgTab = 'details' | 'memberships' | 'request' | 'create' | 'invitations'

// Se organisation, skifte/forlade medlemskaber, samt anmode om/oprette
// organisationer - flyttet fra OrganisationPage.tsx (`/organisation`) ind
// i dashboardets Organisation-fane (US-65), tilgængelig for alle
// brugere (ikke privilegie-gated, i modsætning til Administration-
// fanen). Rediger/slet organisation ligger i Administration-fanen (se
// OrganisationAdminPanel.tsx).
//
// "Organisation"-underfanen (navn, admin-badge, medlemsantal) vises kun
// for administratorer af den aktive organisation - for et menigt medlem
// er de tal ikke handlingsrelevante, og fjernes for at rydde op i antal
// faner. Menige medlemmer lander i stedet direkte på "Mine
// organisationer".
//
// Bruger uden organisation: samme fane tilbyder både "Opret organisation"
// (US-58) og "Anmod om medlemskab" (US-05) som to underfaner, da det er
// de to eneste veje ind i en organisation, og brugeren ellers selv
// skulle vide/finde den anden vej.
export function OrganisationTab() {
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

    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loadingOrganisations, setLoadingOrganisations] = useState(true)
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [requestSuccess, setRequestSuccess] = useState(false)

    // Henter listen af organisationer man kan anmode om medlemskab af, kun
    // relevant for brugere uden egen organisation - undgår et unødvendigt
    // kald for brugere der allerede er medlem et sted.
    useEffect(() => {
        if (isLoading || organisation) return

        let cancelled = false

        async function fetchOrganisations() {
            const { data, error } = await supabase
                .from('organisations')
                .select('id, name')
                .order('name')

            if (cancelled) return

            if (error) {
                console.error('Kunne ikke hente organisationer:', error.message)
            } else {
                setOrganisations(data)
            }
            setLoadingOrganisations(false)
        }

        fetchOrganisations()
        return () => {
            cancelled = true
        }
    }, [isLoading, organisation])

    async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!createName.trim()) {
            setCreateValidationError('Organisationens navn skal udfyldes.')
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

    const readableError = readableApiError

    if (isLoading || loadingPendingRequest) {
        return <p className="text-slate-400">Indlæser organisation...</p>
    }

    if (queryError) {
        return (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
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
                <h2 className="text-lg font-semibold text-slate-100 mb-2">Ingen aktiv organisation</h2>
                <p className="text-sm text-slate-400 mb-6">
                    {hasOtherMemberships
                        ? 'Du er medlem af en eller flere organisationer, men har ingen aktiv lige nu - vælg en under "Mine organisationer", eller opret/anmod om en ny.'
                        : 'Du er ikke medlem af en organisation endnu. Opret en ny organisation, eller anmod om medlemskab af en eksisterende.'}
                </p>

                {pendingRequest ? (
                    <div className="rounded-md bg-accent/10 border border-accent/40 text-accent text-sm px-3 py-2">
                        Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
                    </div>
                ) : (
                    (() => {
                        const noOrgTabDefs: { key: NoOrgTab; label: string; icon: LucideIcon }[] = [
                            { key: 'create', label: 'Opret organisation', icon: Plus },
                            { key: 'request', label: 'Anmod om medlemskab', icon: Handshake },
                            ...(hasOtherMemberships
                                ? [{ key: 'memberships' as NoOrgTab, label: 'Mine organisationer', icon: Users }]
                                : []),
                            ...((pendingInvitations?.length ?? 0) > 0
                                ? [{ key: 'invitations' as NoOrgTab, label: `Invitationer (${pendingInvitations?.length})`, icon: Send }]
                                : []),
                        ]

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                                <nav className="md:col-span-4 lg:col-span-4 xl:col-span-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar rounded-lg border border-slate-800 bg-surface p-2 md:p-3">
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

                                <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 min-w-0 rounded-lg border border-slate-800 bg-surface p-4 sm:p-6">
                                    {noOrgTab === 'memberships' ? (
                                        <MyMembershipsSection />
                                    ) : noOrgTab === 'invitations' ? (
                                        <InvitationsSection />
                                    ) : noOrgTab === 'create' ? (
                                        <>
                                            {(createValidationError || createErrorMessage) && (
                                                <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                                                    {createValidationError ?? createErrorMessage}
                                                </div>
                                            )}
                                            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1" htmlFor="create-name">Organisationens navn</label>
                                                    <input
                                                        id="create-name"
                                                        type="text"
                                                        value={createName}
                                                        onChange={(e) => setCreateName(e.target.value)}
                                                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={creating}
                                                    className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                                                >
                                                    {creating ? 'Opretter...' : 'Opret organisation'}
                                                </button>
                                            </form>
                                        </>
                                    ) : requestSuccess ? (
                                        <div className="rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2">
                                            Din medlemsanmodning er sendt og afventer godkendelse fra organisationens administrator.
                                        </div>
                                    ) : (
                                        <>
                                            {requestErrorMessage && (
                                                <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                                                    {requestErrorMessage}
                                                </div>
                                            )}
                                            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1" htmlFor="request-org">Vælg organisation</label>
                                                    <select
                                                        id="request-org"
                                                        value={selectedOrgId}
                                                        onChange={(e) => setSelectedOrgId(e.target.value)}
                                                        disabled={loadingOrganisations}
                                                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
                                                    >
                                                        <option value="" disabled>
                                                            {loadingOrganisations ? 'Henter organisationer...' : 'Vælg en organisation'}
                                                        </option>
                                                        {organisations.map((org) => (
                                                            <option key={org.id} value={org.id}>
                                                                {org.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={requesting || !selectedOrgId}
                                                    className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                                                >
                                                    {requesting ? 'Sender anmodning...' : 'Send anmodning'}
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
    const isOrgAdmin = activeMembership?.isAdmin ?? false

    // Rolle-baseret fane-sæt: "Organisation" (navn/badge/medlemsantal) er
    // kun relevant for administratoren af den aktive organisation. Et
    // menigt medlem ser derfor kun de handlingsorienterede faner, og
    // lander på "Mine organisationer" i stedet.
    const orgTabDefs: { key: OrgTab; label: string; icon: LucideIcon }[] = [
        ...(isOrgAdmin ? [{ key: 'details' as OrgTab, label: 'Organisation', icon: Building2 }] : []),
        { key: 'memberships', label: 'Mine organisationer', icon: Users },
        { key: 'request', label: 'Anmod om medlemskab', icon: Handshake },
        { key: 'create', label: 'Opret organisation', icon: Plus },
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
            <nav className="md:col-span-4 lg:col-span-4 xl:col-span-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar rounded-lg border border-slate-800 bg-surface p-2 md:p-3">
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

            <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 min-w-0 rounded-lg border border-slate-800 bg-surface p-4 sm:p-6">
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
                            <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2">
                                Organisationen "{createdOrgName}" er oprettet og er nu din aktive organisation.
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                                <Building2 className="w-7 h-7 text-slate-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-100">{organisation.name}</h3>
                                    {activeMembership?.isAdmin && (
                                        <span className="text-xs font-medium bg-accent/15 text-accent rounded-full px-2 py-0.5">
                                            Administrator
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400">{activeMembership?.roleName ?? 'Ingen rolle tildelt'}</p>
                            </div>
                        </div>

                        <dl className="divide-y divide-slate-800 border-t border-slate-800">
                            <div className="py-3 flex justify-between gap-4">
                                <dt className="text-sm text-slate-400">Antal medlemmer</dt>
                                <dd className="text-sm text-right">{activeMembership?.memberCount ?? '—'}</dd>
                            </div>
                        </dl>
                    </>
                )}
            </div>
        </div>
    )
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

// US-67: invitationer andre organisationer har sendt til den indloggede
// bruger. Samme accepter/afvis-bekræft-mønster som RequestRow i
// MembershipRequestsPanel.tsx (admin-siden af den anden retning).
function InvitationsSection() {
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

    const listError = readableApiError(queryError)
    const actionError = readableApiError(mutationError)

    return (
        <div>
            {(listError || actionError) && (
                <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                    {listError ?? actionError}
                </div>
            )}

            {isLoading ? (
                <p className="text-slate-400">Indlæser invitationer...</p>
            ) : !invitations || invitations.length === 0 ? (
                <p className="text-slate-400">Du har ingen ventende invitationer.</p>
            ) : (
                <ul className="divide-y divide-slate-800 border-t border-slate-800">
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
    const decision = pendingDecision?.invitationId === invitation.id ? pendingDecision : null

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-medium">{invitation.organisationName}</p>
                <p className="text-xs text-slate-400 mt-1">Inviteret {formatDate(invitation.invitedAt)}</p>
            </div>

            {decision ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-400 max-w-xs">
                        {decision.decision === 'Accepted'
                            ? `Er du sikker på, at du vil blive medlem af ${invitation.organisationName}?`
                            : `Er du sikker på, at invitationen skal afvises?`}
                    </p>
                    <button
                        type="button"
                        onClick={() => onConfirm(decision)}
                        disabled={submitting}
                        className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {submitting ? 'Behandler...' : 'Ja'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-60"
                    >
                        Annuller
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
                        Acceptér
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelect({ invitationId: invitation.id, decision: 'Rejected' })}
                        disabled={submitting}
                        className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-60"
                    >
                        Afvis
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
    const { data: pendingRequest, isLoading: loadingPendingRequest } = useGetMyPendingRequestQuery()
    const { data: memberships } = useGetMyMembershipsQuery()
    const [requestMembership, { isLoading: requesting, error: requestError }] = useRequestMembershipMutation()

    const [organisations, setOrganisations] = useState<Organisation[]>([])
    const [loadingOrganisations, setLoadingOrganisations] = useState(true)
    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [requestSuccess, setRequestSuccess] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function fetchOrganisations() {
            const { data, error } = await supabase
                .from('organisations')
                .select('id, name')
                .order('name')

            if (cancelled) return

            if (error) {
                console.error('Kunne ikke hente organisationer:', error.message)
            } else {
                setOrganisations(data)
            }
            setLoadingOrganisations(false)
        }

        fetchOrganisations()
        return () => {
            cancelled = true
        }
    }, [])

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
        return <p className="text-slate-400">Indlæser...</p>
    }

    if (pendingRequest) {
        return (
            <div className="rounded-md bg-accent/10 border border-accent/40 text-accent text-sm px-3 py-2">
                Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
            </div>
        )
    }

    if (requestSuccess) {
        return (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2">
                Din medlemsanmodning er sendt og afventer godkendelse fra organisationens administrator.
            </div>
        )
    }

    // Organisationer brugeren allerede er medlem af, skal ikke tilbydes -
    // relevant her, da brugeren (i modsætning til no-org-fligen) allerede
    // kan have medlemskaber.
    const myOrgIds = new Set((memberships ?? []).map((membership) => membership.organisationId))
    const availableOrganisations = organisations.filter((org) => !myOrgIds.has(org.id))

    const requestErrorMessage = readableApiError(requestError)

    return (
        <>
            {requestErrorMessage && (
                <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                    {requestErrorMessage}
                </div>
            )}

            {!loadingOrganisations && availableOrganisations.length === 0 ? (
                <p className="text-slate-400">Der er ingen andre organisationer at anmode om medlemskab af.</p>
            ) : (
                <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1" htmlFor="request-org">Vælg organisation</label>
                        <select
                            id="request-org"
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                            disabled={loadingOrganisations}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
                        >
                            <option value="" disabled>
                                {loadingOrganisations ? 'Henter organisationer...' : 'Vælg en organisation'}
                            </option>
                            {availableOrganisations.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={requesting || !selectedOrgId}
                        className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        {requesting ? 'Sender anmodning...' : 'Send anmodning'}
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
    const [createOrganisation, { isLoading: creating, error: createError }] = useCreateOrganisationMutation()

    const [createName, setCreateName] = useState('')
    const [createValidationError, setCreateValidationError] = useState<string | null>(null)

    async function handleCreateSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const trimmed = createName.trim()
        if (!trimmed) {
            setCreateValidationError('Organisationens navn skal udfyldes.')
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

    const createErrorMessage = readableApiError(createError)

    return (
        <>
            {(createValidationError || createErrorMessage) && (
                <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                    {createValidationError ?? createErrorMessage}
                </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1" htmlFor="create-name-existing">Organisationens navn</label>
                    <input
                        id="create-name-existing"
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={creating}
                    className="self-start bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {creating ? 'Opretter...' : 'Opret organisation'}
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
    const { data: memberships, isLoading, error: queryError } = useGetMyMembershipsQuery()
    // Vises efter et vellykket "Forlad" - løftet op hertil (frem for at
    // ligge i selve rækken) fordi rækken forsvinder fra listen, så snart
    // 'Membership' invalideres og listen henter frisk data igen - en
    // besked i selve rækken ville derfor aldrig nå at blive vist.
    const [actionMessage, setActionMessage] = useState<string | null>(null)

    function handleLeft(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        if (!wasActive) {
            setActionMessage(`Du har forladt "${organisationName}".`)
        } else if (newActiveOrganisation) {
            setActionMessage(`Du har forladt "${organisationName}". Din aktive organisation er nu "${newActiveOrganisation.name}".`)
        } else {
            setActionMessage(`Du har forladt "${organisationName}". Du har ingen aktiv organisation længere.`)
        }
    }

    if (isLoading) {
        return <p className="text-slate-400">Indlæser dine organisationer...</p>
    }

    const listError = readableApiError(queryError)
    if (listError) {
        return (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                {listError}
            </div>
        )
    }

    if (!memberships || memberships.length === 0) {
        return <p className="text-slate-400">Du er ikke medlem af nogen organisationer.</p>
    }

    return (
        <div>
            {actionMessage && (
                <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2">
                    {actionMessage}
                </div>
            )}

            <ul className="divide-y divide-slate-800 border-t border-slate-800">
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

    const actionError = readableApiError(switchError) ?? readableApiError(leaveError)

    return (
        <li className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="font-medium">{membership.organisationName}</p>
                    <p className="text-sm text-slate-400">{membership.roleName ?? 'Ingen rolle tildelt'}</p>
                </div>

                <div className="flex items-center gap-2">
                    {membership.isActive ? (
                        <span className="text-sm font-medium text-accent">Aktiv</span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSwitch}
                            disabled={switching}
                            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-60"
                        >
                            {switching ? 'Skifter...' : 'Gør aktiv'}
                        </button>
                    )}

                    {confirmingLeave ? (
                        <>
                            <span className="text-sm text-slate-400">Er du sikker?</span>
                            <button
                                type="button"
                                onClick={handleLeave}
                                disabled={leaving}
                                className="text-red-400 text-sm font-medium hover:underline disabled:opacity-60"
                            >
                                {leaving ? 'Forlader...' : 'Ja, forlad'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingLeave(false)}
                                disabled={leaving}
                                className="text-slate-400 text-sm hover:underline disabled:opacity-60"
                            >
                                Annuller
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmingLeave(true)}
                            className="rounded-md border border-red-900/40 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-950/40 transition-colors"
                        >
                            Forlad
                        </button>
                    )}
                </div>
            </div>

            {actionError && <p className="text-red-400 text-xs mt-2">{actionError}</p>}
        </li>
    )
}
