// src/components/dashboard/OrganisationTab.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, Handshake, Plus, Send, Users } from 'lucide-react'
import {
    useActiveMembership,
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useGetMyOrganisationQuery,
    useLeaveOrganisationMutation,
    useSetActiveOrganisationMutation,
} from '../../store/apis/organisationApi'
import { useGetMyPendingRequestQuery, useRequestMembershipMutation } from '../../store/apis/membershipApi'
import { formatDate } from '../../utils/formatDate'
import { organisationExitMessage } from '../../utils/organisationExitMessage'
import { useGetMyPendingInvitationsQuery, useRespondToInvitationMutation } from '../../store/apis/invitationApi'
import { OrganisationPickerComponent } from './organisationPickerComponent'
import { OrganisationHeader } from './OrganisationHeader'
import { PendingRequestMessage } from '../pendingRequestBanner/PendingRequestBanner'
import { Alert } from '../common/Alert'
import { DecisionActions } from '../common/DecisionActions'
import { DetailList, DetailRow } from '../common/DetailList'
import { InlineConfirm } from '../common/InlineConfirm'
import { SideNavLayout } from '../common/SideNavLayout'
import type { SideNavTab } from '../../types/common/layoutType'
import type { Decision } from '../../types/common/confirmType'
import type {
    CreateOrganisationSectionProps,
    MembershipRowProps,
    MyMembership,
    Organisation,
} from '../../types/organisation/organisationType'
import type { InvitationRowProps } from '../../types/membership/membershipType'

type OrgTab = 'details' | 'memberships' | 'request' | 'create' | 'invitations'

// Se organisation, skifte/forlade medlemskaber, samt anmode om/oprette
// organisationer - tilgængelig for alle brugere (ikke privilegie-gated,
// i modsætning til Administration-fanen). Rediger/slet organisation
// ligger i Administration-fanen (se OrganisationAdminPanel.tsx).
//
// Bruger uden aktiv organisation: samme underfaner undtagen
// "Organisation" - "Opret organisation" (US-58) og "Anmod om medlemskab"
// (US-05) er de to veje ind, og "Mine organisationer" vises, hvis
// brugeren har andre medlemskaber at skifte til.
export function OrganisationTab() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    const { data: memberships } = useGetMyMembershipsQuery()
    const { data: pendingRequest, isLoading: loadingPendingRequest } = useGetMyPendingRequestQuery()
    // US-67: invitationer andre organisationer har sendt til MIG.
    const { data: pendingInvitations } = useGetMyPendingInvitationsQuery()
    const invitationCount = pendingInvitations?.length ?? 0

    const [orgTab, setOrgTab] = useState<OrgTab | null>(null)
    // Vises på "Organisation"-underfanen lige efter en ny organisation er
    // oprettet (US-60) - ryddes, når brugeren selv skifter fane igen.
    const [createdOrgName, setCreatedOrgName] = useState<string | null>(null)

    // Deep-link fra invitations-notifikationen (?section=invitations):
    // vinder over det lokale valg, indtil brugeren selv skifter underfane.
    // Afledt i stedet for en effect, så det også virker, når fanen
    // allerede er åben, og notifikationen klikkes fra klokken.
    const [searchParams, setSearchParams] = useSearchParams()
    const linkedToInvitations = searchParams.get('section') === 'invitations' && invitationCount > 0

    function switchOrgTab(tab: OrgTab) {
        if (searchParams.has('section')) {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                next.delete('section')
                return next
            }, { replace: true })
        }
        setCreatedOrgName(null)
        setOrgTab(tab)
    }

    function handleOrganisationCreated(name: string) {
        setCreatedOrgName(name)
        setOrgTab('details')
    }

    if (isLoading || loadingPendingRequest) {
        return <p className="text-secondary dark:text-slate-400">{t('loading')}</p>
    }

    if (queryError) {
        return <Alert>{readableError(queryError)}</Alert>
    }

    const hasMemberships = (memberships?.length ?? 0) > 0

    // En bruger uden organisation med en ventende anmodning venter bare
    // på svar - der er intet andet at gøre her.
    if (!organisation && pendingRequest) {
        return (
            <div>
                <NoActiveOrganisationIntro hasMemberships={hasMemberships} />
                <Alert tone="info">
                    <PendingRequestMessage organisationName={pendingRequest.organisationName} />
                </Alert>
            </div>
        )
    }

    const tab = {
        details: { key: 'details', label: t('tabs.details'), icon: Building2 },
        memberships: { key: 'memberships', label: t('tabs.memberships'), icon: Users },
        request: { key: 'request', label: t('tabs.request'), icon: Handshake },
        create: { key: 'create', label: t('tabs.create'), icon: Plus },
        invitations: { key: 'invitations', label: `${t('tabs.invitations')} (${invitationCount})`, icon: Send },
    } satisfies Record<OrgTab, SideNavTab<OrgTab>>
    // Uden organisation er oprettelse den oplagte første vej ind.
    const tabs: SideNavTab<OrgTab>[] = [
        ...(organisation
            ? [tab.details, tab.memberships, tab.request, tab.create]
            : [tab.create, tab.request, ...(hasMemberships ? [tab.memberships] : [])]),
        ...(invitationCount > 0 ? [tab.invitations] : []),
    ]
    const activeTab: OrgTab = linkedToInvitations
        ? 'invitations'
        : orgTab && tabs.some((tab) => tab.key === orgTab) ? orgTab : tabs[0].key

    return (
        <div>
            {!organisation && <NoActiveOrganisationIntro hasMemberships={hasMemberships} />}

            <SideNavLayout tabs={tabs} active={activeTab} onSelect={switchOrgTab}>
                {activeTab === 'memberships' && <MyMembershipsSection />}
                {activeTab === 'request' && <RequestMembershipSection />}
                {activeTab === 'create' && <CreateOrganisationSection onCreated={handleOrganisationCreated} />}
                {activeTab === 'invitations' && <InvitationsSection />}
                {activeTab === 'details' && organisation && (
                    <OrganisationDetails organisation={organisation} createdOrgName={createdOrgName} />
                )}
            </SideNavLayout>
        </div>
    )
}

function NoActiveOrganisationIntro({ hasMemberships }: { hasMemberships: boolean }) {
    const { t } = useTranslation('organisation')

    return (
        <>
            <h2 className="text-lg font-semibold text-primary mb-2 dark:text-slate-100">{t('noActiveTitle')}</h2>
            <p className="text-sm text-secondary mb-6 dark:text-slate-400">
                {hasMemberships ? t('noActiveWithMemberships') : t('noActiveWithout')}
            </p>
        </>
    )
}

// "Organisation"-underfanen: navn, admin-badge og medlemsantal - synlig
// for alle medlemmer af den aktive organisation, ikke kun administratorer.
function OrganisationDetails({ organisation, createdOrgName }: { organisation: Organisation; createdOrgName: string | null }) {
    const { t } = useTranslation('organisation')
    const activeMembership = useActiveMembership()

    return (
        <>
            {createdOrgName && (
                <Alert tone="success" className="mb-4">{t('create.created', { name: createdOrgName })}</Alert>
            )}

            <OrganisationHeader
                name={organisation.name}
                isAdmin={activeMembership?.isAdmin ?? false}
                subtitle={activeMembership?.roleName ?? t('details.noRole')}
            />

            <DetailList>
                <DetailRow label={t('details.memberCount')}>{activeMembership?.memberCount ?? '—'}</DetailRow>
            </DetailList>
        </>
    )
}

// US-67: invitationer andre organisationer har sendt til den indloggede
// bruger. Samme accepter/afvis-bekræft-mønster som RequestRow i
// MembershipRequestsPanel.tsx (admin-siden af den anden retning).
function InvitationsSection() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: invitations, isLoading, error: queryError } = useGetMyPendingInvitationsQuery()
    const [respondToInvitation, { isLoading: submitting, error: mutationError }] = useRespondToInvitationMutation()

    const [pending, setPending] = useState<{ invitationId: string; decision: Decision } | null>(null)

    async function confirmDecision() {
        if (!pending) return
        try {
            await respondToInvitation({
                invitationId: pending.invitationId,
                decision: pending.decision === 'accept' ? 'Accepted' : 'Rejected',
            }).unwrap()
        } catch {
            // Fejlen vises via mutationError.
        } finally {
            setPending(null)
        }
    }

    return (
        <div>
            <Alert className="mb-4">{readableError(queryError) ?? readableError(mutationError)}</Alert>

            {isLoading ? (
                <p className="text-secondary dark:text-slate-400">{t('invitations.loading')}</p>
            ) : !invitations || invitations.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('myInvitations.empty')}</p>
            ) : (
                <ul className="divide-y divide-border-gray border-t border-border-gray">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="py-4">
                            <InvitationRow
                                invitation={invitation}
                                pending={pending?.invitationId === invitation.id ? pending.decision : null}
                                submitting={submitting}
                                onSelect={(decision) => setPending({ invitationId: invitation.id, decision })}
                                onCancel={() => setPending(null)}
                                onConfirm={confirmDecision}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function InvitationRow({ invitation, pending, submitting, onSelect, onCancel, onConfirm }: InvitationRowProps) {
    const { t } = useTranslation('organisation')

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <p className="font-medium">{invitation.organisationName}</p>
                <p className="text-xs text-secondary mt-1 dark:text-slate-400">{t('invitations.invitedOnDate', { date: formatDate(invitation.invitedAt) })}</p>
            </div>

            <DecisionActions
                pending={pending}
                onSelect={onSelect}
                onConfirm={onConfirm}
                onCancel={onCancel}
                submitting={submitting}
                acceptLabel={t('myInvitations.accept')}
                rejectLabel={t('myInvitations.reject')}
                confirmText={pending === 'accept'
                    ? t('myInvitations.confirmAccept', { name: invitation.organisationName })
                    : t('myInvitations.confirmReject')}
            />
        </div>
    )
}

// Anmod om medlemskab af en (anden) organisation (US-05/US-59).
// Organisationer brugeren allerede er medlem af, tilbydes ikke.
function RequestMembershipSection() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: pendingRequest, isLoading: loadingPendingRequest } = useGetMyPendingRequestQuery()
    const { data: memberships } = useGetMyMembershipsQuery()
    const [requestMembership, { isLoading: requesting, error: requestError }] = useRequestMembershipMutation()

    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [requestSuccess, setRequestSuccess] = useState(false)

    async function handleRequestSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        try {
            // Mutationen invaliderer 'PendingRequest', så banneret
            // opdaterer sig selv.
            await requestMembership({ organisationId: selectedOrgId }).unwrap()
            setRequestSuccess(true)
        } catch {
            // Fejlen vises via requestError.
        }
    }

    if (loadingPendingRequest) {
        return <p className="text-secondary dark:text-slate-400">{t('common:loading')}</p>
    }

    if (pendingRequest) {
        return (
            <Alert tone="info">
                <PendingRequestMessage organisationName={pendingRequest.organisationName} />
            </Alert>
        )
    }

    if (requestSuccess) {
        return <Alert tone="success">{t('request.pending')}</Alert>
    }

    const myOrgIds = (memberships ?? []).map((membership) => membership.organisationId)

    return (
        <>
            <Alert className="mb-4">{readableError(requestError)}</Alert>

            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400">{t('request.chooseLabel')}</label>
                    <OrganisationPickerComponent
                        value={selectedOrgId}
                        onChange={setSelectedOrgId}
                        excludeIds={myOrgIds}
                    />
                </div>
                <button
                    type="submit"
                    disabled={requesting || !selectedOrgId}
                    className="self-start bg-accent text-accent-text rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {requesting ? t('request.submitting') : t('request.submit')}
                </button>
            </form>
        </>
    )
}

// Opret organisation (US-58/US-60). Den nye organisation bliver altid
// brugerens aktive, og brugeren bliver admin i den.
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
            // Fejlen vises via createError - feltets indhold bevares.
        }
    }

    return (
        <>
            <Alert className="mb-4">{createValidationError ?? readableError(createError)}</Alert>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="create-organisation-name">{t('create.nameLabel')}</label>
                    <input
                        id="create-organisation-name"
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={creating}
                    className="self-start bg-accent text-accent-text rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {creating ? t('create.submitting') : t('create.submit')}
                </button>
            </form>
        </>
    )
}

// "Mine organisationer" (US-59/US-61): alle brugerens medlemskaber, med
// mulighed for at skifte aktiv organisation og for at forlade en.
function MyMembershipsSection() {
    const { t } = useTranslation(['organisation', 'common', 'errors'])
    const { data: memberships, isLoading, error: queryError } = useGetMyMembershipsQuery()
    // Vises efter et vellykket "Forlad" - løftet op hertil, fordi rækken
    // forsvinder fra listen, så snart 'Membership' invalideres.
    const [actionMessage, setActionMessage] = useState<string | null>(null)

    function handleLeft(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        setActionMessage(organisationExitMessage(t, 'organisation:myOrganisations.left', organisationName, wasActive, newActiveOrganisation))
    }

    if (isLoading) {
        return <p className="text-secondary dark:text-slate-400">{t('myOrganisations.loading')}</p>
    }

    const listError = readableError(queryError)
    if (listError) {
        return <Alert>{listError}</Alert>
    }

    if (!memberships || memberships.length === 0) {
        return <p className="text-secondary dark:text-slate-400">{t('myOrganisations.empty')}</p>
    }

    return (
        <div>
            <Alert tone="success" className="mb-4">{actionMessage}</Alert>

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

                <div className="flex flex-wrap items-center gap-2">
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
                        <InlineConfirm
                            question={t('myOrganisations.areYouSure')}
                            confirmLabel={t('myOrganisations.confirmLeaveYes')}
                            loadingLabel={t('myOrganisations.leaving')}
                            isLoading={leaving}
                            onConfirm={handleLeave}
                            onCancel={() => setConfirmingLeave(false)}
                        />
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
