import type { Decision } from '../common/confirmType'

// Minimal info om brugerens ventende anmodning, nok til at vise
// en banner et andet sted i appen (fx "din anmodning afventer hos X").
export interface PendingMembershipRequest {
    organisationId: string
    organisationName: string
}

// En person på en af administratorens ventende lister (anmodninger og
// sendte invitationer). Navn og email hentes fra personens profil, så
// administratoren kan se hvem det er - ikke bare et bruger-id.
interface PendingPerson {
    id: string
    userId: string
    firstName: string
    lastName: string
    email: string
}

export interface MembershipRequest extends PendingPerson {
    requestedAt: string
}

export interface SentInvitation extends PendingPerson {
    invitedAt: string
}

// Accepter og afvis er samme operation med forskellig slutstatus, så de
// deler ét endpoint. Resten (reviewed_at/by, medlemskabet) sætter
// databasens triggere.
export type ReviewDecision = 'Accepted' | 'Rejected'

export interface ReviewMembershipRequestInput {
    requestId: string
    decision: ReviewDecision
}

// En invitation set fra MODTAGERENS side (US-67) - admin-initieret,
// modsat MembershipRequest som er bruger-initieret. organisationName
// hentes med, så modtageren kan se hvem der har inviteret dem.
export interface MembershipInvitation {
    id: string
    organisationId: string
    organisationName: string
    invitedAt: string
}

export interface RespondInvitationInput {
    invitationId: string
    decision: ReviewDecision
}

// En række med accepter/afvis + bekræft-trin (DecisionActions).
interface DecisionRowProps {
    // Valgt beslutning for netop denne række, der afventer bekræftelse.
    pending: Decision | null
    submitting: boolean
    onSelect: (decision: Decision) => void
    onCancel: () => void
    onConfirm: () => void
}

export interface RequestRowProps extends DecisionRowProps {
    request: MembershipRequest
}

export interface InvitationRowProps extends DecisionRowProps {
    invitation: MembershipInvitation
}
