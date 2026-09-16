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
