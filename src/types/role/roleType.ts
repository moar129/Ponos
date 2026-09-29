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
// Fase 3: alle medlemmer har altid mindst standardrollen "Medlem"
// (auto-tildelt ved medlemskab, se create_organisation/
// handle_membership_request_status_change) - roleId er kun null som et
// forsvarsnet, hvis noget skulle gå galt i seedingen.
export interface OrganisationMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  urlPicture: string | null;
}

export interface CreateRoleInput {
    name: string
}

export interface CreateRoleWithPrivilegesInput {
    name: string
    privilegeNames: string[]
}

export interface QuickCreateRoleModalProps {
    isOpen: boolean
    onClose: () => void
    onCreated: (role: Role) => void
    suggestedName?: string
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
    // Fase 3: kan ikke længere være null - et medlem kan ikke gøres
    // rolleløst. "Fjern rolle" i UI'en tildeler i stedet organisationens
    // beskyttede "Medlem"-standardrolle.
    roleId: string
}

// Props til roller/privilegier-matrixen (src/components/dashboard/roles/,
// tidligere kort-pr-rolle-layout i RolesPrivilegesPanel.tsx, US-65).
export interface MatrixCellProps {
    role: Role
    privilegeName: string
    privilege: Privilege | undefined
    isCustom: boolean
    isFullAdmin: boolean
    isProtectedAdminRole: boolean
    // Rollens fulde privilegie-sæt (navn -> Privilege) - kun brugt af
    // admin-rækkens "Vælg alle/Fjern alle"-knap på andre roller end Admin,
    // til at afgøre om rollen allerede har alle øvrige kendte privilegier.
    rolePrivileges: Map<string, Privilege> | undefined
}

export interface MatrixRowProps {
    rowName: string
    isCustom: boolean
    roles: Role[]
    byRoleAndName: Map<string, Map<string, Privilege>>
    isFullAdmin: boolean
    protectedAdminRoleIds: Set<string>
}

export interface RoleColumnHeaderProps {
    role: Role
    isLocked: boolean
    lockedReason: string | null
}
