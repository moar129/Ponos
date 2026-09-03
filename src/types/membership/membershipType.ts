// Minimal info om brugerens ventende anmodning, nok til at vise
// en banner et andet sted i appen (fx "din anmodning afventer hos X").
export interface PendingMembershipRequest {
    organisationId: string
    organisationName: string
}
