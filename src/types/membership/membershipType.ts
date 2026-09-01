// Minimal info om brugerens ventende anmodning, nok til at vise
// en banner et andet sted i appen (fx "din anmodning afventer hos X").
export interface PendingMembershipRequest {
    organisationId: string
    organisationName: string
}

export interface MembershipState {
    pendingRequest: PendingMembershipRequest | null
    // 'loading' mens vi endnu ikke har tjekket databasen,
    // 'checked' når vi ved besked (uanset om der findes en anmodning eller ej)
    status: 'loading' | 'checked'
}