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

export interface UpdateRoleInput {
    roleId: string
    name: string
}

export interface CreatePrivilegeInput {
    roleId: string
    name: string
}

export interface UpdatePrivilegeInput {
    privilegeId: string
    name: string
}

export interface AssignRoleInput {
    userId: string
    // null = fjern rollen (medlemmet bliver et almindeligt medlem uden
    // administrative privilegier) - RLS'ens escalation-guard tillader
    // eksplicit "role_id is null" for alle med manage_roles, ikke kun
    // fulde administratorer.
    roleId: string | null
}

// Props til komponenter flyttet fra RolesPage.tsx ind i
// RolesPrivilegesPanel.tsx (US-65).
export interface RoleCardProps {
    role: Role
    privileges: Privilege[]
}

export interface PrivilegeRowProps {
    privilege: Privilege
    roleName: string
}
