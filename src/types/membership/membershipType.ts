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
