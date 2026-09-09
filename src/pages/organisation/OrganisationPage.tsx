// src/pages/organisation/OrganisationPage.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useGetMyOrganisationQuery,
    useLeaveOrganisationMutation,
    useSetActiveOrganisationMutation,
    useUpdateMyOrganisationMutation,
} from '../../store/apis/organisationApi'
import { useGetMyPendingRequestQuery, useRequestMembershipMutation } from '../../store/apis/membershipApi'
import { MANAGE_ORGANISATION_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import type { MyMembership, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'

// Tom formular-tilstand, indtil admin trykker "Rediger organisation" og
// feltet fyldes med organisationens nuværende værdi.
const emptyForm: UpdateOrganisationInput = { name: '' }

type NoOrgTab = 'create' | 'request'

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableApiError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

type OrgTab = 'details' | 'memberships' | 'request' | 'create'

// Se organisation og rediger organisation. Alle medlemmer kan se
// organisationens navn; kun administratorer kan redigere det - adgangen
// håndhæves server-side af RLS, tjekket her er kun for ikke at vise en
// redigeringsknap til brugere uden rettigheder.
//
// Bruger uden organisation: samme side tilbyder både "Opret organisation"
// (US-58) og "Anmod om medlemskab" (US-05) som to faner - i stedet for at
// spredt over to separate sider (`/organisation` og `/request-membership`),
// da det er de to eneste veje ind i en organisation, og brugeren ellers
// selv skulle vide/finde den anden side.
export default function OrganisationPage() {
    const { data: organisation, isLoading, error: queryError } = useGetMyOrganisationQuery()
    const [updateMyOrganisation, { isLoading: saving, error: mutationError }] = useUpdateMyOrganisationMutation()
    const [createOrganisation, { isLoading: creating, error: createError }] = useCreateOrganisationMutation()
    const [requestMembership, { isLoading: requesting, error: requestError }] = useRequestMembershipMutation()
    const { data: pendingRequest, isLoading: loadingPendingRequest } = useGetMyPendingRequestQuery()
    const { hasPrivilege: canManageOrganisation } = useHasPrivilege(MANAGE_ORGANISATION_PRIVILEGE)

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<UpdateOrganisationInput>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)

    const [noOrgTab, setNoOrgTab] = useState<NoOrgTab>('create')
    const [orgTab, setOrgTab] = useState<OrgTab>('details')
    // Vises på "Organisation"-fanen lige efter man har oprettet en ny
    // organisation fra "Opret organisation"-fanen (US-60) - ryddes, når
    // brugeren selv skifter fane igen, så den ikke bliver hængende.
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

    function startEdit(current: Organisation) {
        setForm({ name: current.name })
        setValidationError(null)
        setSavedMessage(false)
        setCreatedOrgName(null)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavedMessage(false)

        if (!form.name.trim()) {
            setValidationError('Organisationens navn skal udfyldes.')
            return
        }
        setValidationError(null)

        try {
            await updateMyOrganisation({ name: form.name.trim() }).unwrap()

            // Mutationen invaliderer 'Organisation', så visningen nedenfor
            // henter og viser det nye navn automatisk.
            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError - vi bliver i redigerings-
            // tilstand, så administratorens indtastning ikke går tabt.
        }
    }

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
        return <p className="text-secondary">Indlæser organisation...</p>
    }

    if (queryError) {
        return (
            <div className="max-w-2xl mx-auto rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {readableError(queryError)}
            </div>
        )
    }

    if (!organisation) {
        const createErrorMessage = readableError(createError)
        const requestErrorMessage = readableError(requestError)

        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-2">Ingen organisation</h1>
                <p className="text-sm text-secondary mb-6">
                    Du er ikke medlem af en organisation endnu. Opret en ny organisation, eller anmod om medlemskab af en eksisterende.
                </p>

                {pendingRequest ? (
                    <div className="rounded-md bg-accent/15 border border-accent text-primary text-sm px-3 py-2">
                        Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2 mb-6 border-b border-border-gray">
                            <button
                                type="button"
                                onClick={() => setNoOrgTab('create')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                    noOrgTab === 'create'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-secondary hover:text-primary'
                                }`}
                            >
                                Opret organisation
                            </button>
                            <button
                                type="button"
                                onClick={() => setNoOrgTab('request')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                    noOrgTab === 'request'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-secondary hover:text-primary'
                                }`}
                            >
                                Anmod om medlemskab
                            </button>
                        </div>

                        {noOrgTab === 'create' ? (
                            <>
                                {(createValidationError || createErrorMessage) && (
                                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                                        {createValidationError ?? createErrorMessage}
                                    </div>
                                )}
                                <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm text-secondary mb-1" htmlFor="create-name">Organisationens navn</label>
                                        <input
                                            id="create-name"
                                            type="text"
                                            value={createName}
                                            onChange={(e) => setCreateName(e.target.value)}
                                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="self-start bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                                    >
                                        {creating ? 'Opretter...' : 'Opret organisation'}
                                    </button>
                                </form>
                            </>
                        ) : requestSuccess ? (
                            <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                                Din medlemsanmodning er sendt og afventer godkendelse fra organisationens administrator.
                            </div>
                        ) : (
                            <>
                                {requestErrorMessage && (
                                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                                        {requestErrorMessage}
                                    </div>
                                )}
                                <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-sm text-secondary mb-1" htmlFor="request-org">Vælg organisation</label>
                                        <select
                                            id="request-org"
                                            value={selectedOrgId}
                                            onChange={(e) => setSelectedOrgId(e.target.value)}
                                            disabled={loadingOrganisations}
                                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
                                        className="self-start bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                                    >
                                        {requesting ? 'Sender anmodning...' : 'Send anmodning'}
                                    </button>
                                </form>
                            </>
                        )}
                    </>
                )}
            </div>
        )
    }

    const saveError = readableError(mutationError)

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
            {/* Overskrift med ikon og navn */}
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-bg-gray flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-secondary" />
                </div>
                <h1 className="text-xl font-semibold text-primary">{organisation.name}</h1>
            </div>

            {/* US-59: en bruger kan være medlem af flere organisationer -
                "Mine organisationer" viser dem alle og lader brugeren skifte
                hvilken der er aktiv. */}
            <div className="flex gap-2 mb-6 border-b border-border-gray">
                <button
                    type="button"
                    onClick={() => switchOrgTab('details')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        orgTab === 'details'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    Organisation
                </button>
                <button
                    type="button"
                    onClick={() => switchOrgTab('memberships')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        orgTab === 'memberships'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    Mine organisationer
                </button>
                <button
                    type="button"
                    onClick={() => switchOrgTab('request')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        orgTab === 'request'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    Anmod om medlemskab
                </button>
                <button
                    type="button"
                    onClick={() => switchOrgTab('create')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        orgTab === 'create'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    Opret organisation
                </button>
            </div>

            {orgTab === 'memberships' ? (
                <MyMembershipsSection />
            ) : orgTab === 'request' ? (
                <RequestMembershipSection />
            ) : orgTab === 'create' ? (
                <CreateOrganisationSection onCreated={handleOrganisationCreated} />
            ) : (
                <>
            {createdOrgName && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    Organisationen "{createdOrgName}" er oprettet og er nu din aktive organisation.
                </div>
            )}

            {savedMessage && !isEditing && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    Organisationens oplysninger er gemt.
                </div>
            )}

            {(validationError || saveError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {validationError ?? saveError}
                </div>
            )}

            {isEditing ? (
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm text-secondary mb-1" htmlFor="name">Navn</label>
                        <input
                            id="name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ name: e.target.value })}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                        >
                            {saving ? 'Gemmer...' : 'Gem ændringer'}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md border border-border-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                        >
                            Annuller
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <dl className="divide-y divide-border-gray border-t border-border-gray">
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Navn</dt>
                            <dd className="text-sm text-right">{organisation.name}</dd>
                        </div>
                    </dl>

                    {canManageOrganisation && (
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => startEdit(organisation)}
                                className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors"
                            >
                                Rediger organisation
                            </button>
                        </div>
                    )}
                </>
            )}
                </>
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
        return <p className="text-secondary">Indlæser...</p>
    }

    if (pendingRequest) {
        return (
            <div className="rounded-md bg-accent/15 border border-accent text-primary text-sm px-3 py-2">
                Din anmodning om medlemskab af <strong>{pendingRequest.organisationName}</strong> afventer godkendelse.
            </div>
        )
    }

    if (requestSuccess) {
        return (
            <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
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
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {requestErrorMessage}
                </div>
            )}

            {!loadingOrganisations && availableOrganisations.length === 0 ? (
                <p className="text-secondary">Der er ingen andre organisationer at anmode om medlemskab af.</p>
            ) : (
                <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm text-secondary mb-1" htmlFor="request-org">Vælg organisation</label>
                        <select
                            id="request-org"
                            value={selectedOrgId}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                            disabled={loadingOrganisations}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
                        className="self-start bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                        {requesting ? 'Sender anmodning...' : 'Send anmodning'}
                    </button>
                </form>
            )}
        </>
    )
}

interface CreateOrganisationSectionProps {
    // US-60: den nyoprettede organisation bliver altid brugerens aktive
    // organisation med det samme (også ved en 2., 3., ...) - kaldes efter
    // succesfuld oprettelse, så den overordnede side kan vise en besked og
    // hoppe over på "Organisation"-fanen, hvor den nye (nu aktive)
    // organisation vises.
    onCreated: (organisationName: string) => void
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
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {createValidationError ?? createErrorMessage}
                </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm text-secondary mb-1" htmlFor="create-name-existing">Organisationens navn</label>
                    <input
                        id="create-name-existing"
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={creating}
                    className="self-start bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {creating ? 'Opretter...' : 'Opret organisation'}
                </button>
            </form>
        </>
    )
}

// "Mine organisationer" (US-59/US-61): liste over alle brugerens
// medlemskaber, med mulighed for at skifte hvilken der er aktiv, og for
// at forlade en organisation. Ligger som en fane på samme side som
// organisationsdetaljer/rediger, i stedet for en separat side - det er
// begge dele "min tilknytning til organisationer".
function MyMembershipsSection() {
    const { data: memberships, isLoading, error: queryError } = useGetMyMembershipsQuery()
    // Vises efter et vellykket "Forlad" - løftet op hertil (frem for at
    // ligge i selve rækken) fordi den forladte organisations række
    // forsvinder fra listen, så snart 'Membership' invalideres og listen
    // henter frisk data igen - en besked i selve rækken ville derfor aldrig
    // nå at blive vist.
    const [leftMessage, setLeftMessage] = useState<string | null>(null)

    function handleLeft(organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) {
        if (!wasActive) {
            setLeftMessage(`Du har forladt "${organisationName}".`)
        } else if (newActiveOrganisation) {
            setLeftMessage(`Du har forladt "${organisationName}". Din aktive organisation er nu "${newActiveOrganisation.name}".`)
        } else {
            setLeftMessage(`Du har forladt "${organisationName}". Du har ingen aktiv organisation længere.`)
        }
    }

    if (isLoading) {
        return <p className="text-secondary">Indlæser dine organisationer...</p>
    }

    const listError = readableApiError(queryError)
    if (listError) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {listError}
            </div>
        )
    }

    if (!memberships || memberships.length === 0) {
        return <p className="text-secondary">Du er ikke medlem af nogen organisationer.</p>
    }

    return (
        <div>
            {leftMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    {leftMessage}
                </div>
            )}

            <ul className="divide-y divide-border-gray border-t border-border-gray">
                {memberships.map((membership: MyMembership) => (
                    <MembershipRow key={membership.organisationId} membership={membership} onLeft={handleLeft} />
                ))}
            </ul>
        </div>
    )
}

interface MembershipRowProps {
    membership: MyMembership
    onLeft: (organisationName: string, wasActive: boolean, newActiveOrganisation: Organisation | null) => void
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
                    <p className="text-sm text-secondary">{membership.roleName ?? 'Ingen rolle tildelt'}</p>
                </div>

                <div className="flex items-center gap-2">
                    {membership.isActive ? (
                        <span className="text-sm font-medium text-accent">Aktiv</span>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSwitch}
                            disabled={switching}
                            className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                        >
                            {switching ? 'Skifter...' : 'Gør aktiv'}
                        </button>
                    )}

                    {confirmingLeave ? (
                        <>
                            <span className="text-sm text-secondary">Er du sikker?</span>
                            <button
                                type="button"
                                onClick={handleLeave}
                                disabled={leaving}
                                className="text-red-700 text-sm font-medium hover:underline disabled:opacity-60"
                            >
                                {leaving ? 'Forlader...' : 'Ja, forlad'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingLeave(false)}
                                disabled={leaving}
                                className="text-secondary text-sm hover:underline disabled:opacity-60"
                            >
                                Annuller
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmingLeave(true)}
                            className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                        >
                            Forlad
                        </button>
                    )}
                </div>
            </div>

            {actionError && <p className="text-red-700 text-xs mt-2">{actionError}</p>}
        </li>
    )
}
