// src/components/dashboard/roles/privilegeLocking.ts
import { ADMIN_ROLE_NAME, MEMBER_ROLE_NAME } from '../../../store/apis/roleApi'
import { ADMIN_PRIVILEGE, PROTECTED_MEMBER_PRIVILEGE_NAMES } from '../../../store/apis/privilegeApi'
import type { Role } from '../../../types/role/roleType'

export interface LockState {
    locked: boolean
    reason: string | null
}

// Afgør om én matrix-celle (rolle × privilegie) er låst mod toggle.
// Genskaber i matrix-form den logik der tidligere lå spredt i RoleCard/
// PrivilegeRow (RolesPrivilegesPanel.tsx-historik) - skal matche
// databasens prevent_admin_role_change/prevent_default_role_change/
// prevent_default_role_privilege_change-triggers og RLS'ens
// escalation-guard (docs/dbSchema.sql 15.6).
export function cellLockState(
    role: Role,
    privilegeName: string,
    hasPrivilege: boolean,
    isFullAdmin: boolean,
    isProtectedAdminRole: boolean,
): LockState {
    const isMemberRole = role.name === MEMBER_ROLE_NAME

    // Organisationens indbyggede Admin-rolle har allerede admin-
    // privilegiet, som er et supersæt af alt andet - der er ingen grund
    // til at kunne tilføje/fjerne enkeltprivilegier på den, hele kolonnen
    // er derfor låst (ikke kun admin-privilegiet selv).
    if (isProtectedAdminRole) {
        return { locked: true, reason: 'Admin har allerede fuld adgang og kan ikke tilpasses' }
    }

    // Kun de 2 navngivne privilegier er faste på Medlem - andre
    // eventuelle tildelte privilegier på rollen må frit fjernes.
    if (isMemberRole && hasPrivilege && PROTECTED_MEMBER_PRIVILEGE_NAMES.includes(privilegeName)) {
        return { locked: true, reason: 'Fast del af standardrollen Medlem' }
    }

    // Medlem kan aldrig få nye privilegier tilføjet.
    if (isMemberRole && !hasPrivilege) {
        return { locked: true, reason: 'Standardrollen Medlem kan ikke udvides' }
    }

    // Kun en reel administrator må tildele admin-privilegiet - RLS'ens
    // escalation-guard ville alligevel afvise andre, så vi undgår at
    // tilbyde en dømt handling.
    if (privilegeName === ADMIN_PRIVILEGE && !isFullAdmin) {
        return { locked: true, reason: 'Kun en administrator kan tildele admin-privilegiet' }
    }

    return { locked: false, reason: null }
}

// Afgør om en hel rolle-kolonne er låst mod omdøb/slet - uafhængigt af
// cellernes egen lås (se cellLockState). Medlems kolonne er fx låst her,
// mens enkelte celler i den stadig kan være togglebare.
export function roleColumnLockState(role: Role, hasAdminPrivilege: boolean): LockState {
    if (role.name === ADMIN_ROLE_NAME && hasAdminPrivilege) {
        return { locked: true, reason: 'Denne rolle har admin-privilegiet og kan ikke omdøbes eller slettes' }
    }
    if (role.name === MEMBER_ROLE_NAME) {
        return { locked: true, reason: 'Standardrollen Medlem kan ikke omdøbes eller slettes' }
    }
    return { locked: false, reason: null }
}
