// Minimal info om brugerens ventende anmodning, nok til at vise
// en banner et andet sted i appen (fx "din anmodning afventer hos X").
export interface PendingMembershipRequest {
    organisationId: string
    organisationName: string
}

// En ventende anmodning set fra administratorens side. Navn og
// email hentes fra ansøgerens profil, så administratoren kan se hvem der
// beder om adgang - ikke bare et bruger-id.
export interface MembershipRequest {
    id: string
    userId: string
    firstName: string
    lastName: string
    email: string
    requestedAt: string
}

// accepter og afvis er samme operation med forskellig
// slutstatus, så de deler ét endpoint. reviewed_at/reviewed_by og selve
// org-tilknytningen sættes server-side af databasens trigger.
export interface ReviewMembershipRequestInput {
    requestId: string
    decision: 'Accepted' | 'Rejected'
}

// Props til RequestRow, flyttet fra MembershipRequestsPage.tsx ind i
// MembershipRequestsPanel.tsx (US-65).
export interface RequestRowProps {
    request: MembershipRequest
    pendingDecision: ReviewMembershipRequestInput | null
    submitting: boolean
    onSelect: (decision: ReviewMembershipRequestInput) => void
    onCancel: () => void
    onConfirm: (decision: ReviewMembershipRequestInput) => void
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

// En sendt (ventende) invitation set fra ORGANISATIONENS/administratorens
// side. Navn/email hentes fra den inviteredes profil.
export interface SentInvitation {
    id: string
    userId: string
    firstName: string
    lastName: string
    email: string
    invitedAt: string
}

// Acceptér og afvis er samme operation med forskellig slutstatus, samme
// mønster som ReviewMembershipRequestInput.
export interface RespondInvitationInput {
    invitationId: string
    decision: 'Accepted' | 'Rejected'
}

// Props til InvitationRow i OrganisationTab.tsx (modtager-siden).
export interface InvitationRowProps {
    invitation: MembershipInvitation
    pendingDecision: RespondInvitationInput | null
    submitting: boolean
    onSelect: (decision: RespondInvitationInput) => void
    onCancel: () => void
    onConfirm: (decision: RespondInvitationInput) => void
}
