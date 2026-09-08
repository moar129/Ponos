// En rolle tilhørende organisationen (US-12).
export interface Role {
    id: string
    name: string
}

// Et privilege tilknyttet en rolle (US-13).
export interface Privilege {
    id: string
    roleId: string
    name: string
}

// Et medlem af organisationen, som kan tildeles en rolle (US-11).
// roleId/roleName er null, hvis medlemmet endnu ikke har en rolle.
export interface OrganisationMember {
    id: string
    firstName: string
    lastName: string
    email: string
    roleId: string | null
}

export interface CreateRoleInput {
    name: string
}

export interface CreatePrivilegeInput {
    roleId: string
    name: string
}

export interface AssignRoleInput {
    userId: string
    roleId: string
}
