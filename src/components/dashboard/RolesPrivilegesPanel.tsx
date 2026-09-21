// src/components/dashboard/RolesPrivilegesPanel.tsx
import { PrivilegeMatrix } from './roles/PrivilegeMatrix'

// Roller og privileges (US-12 + US-13) som en matrix, samlet under
// dashboardets Administration-fane (US-65). Erstatter det tidligere
// kort-pr-rolle-layout (bruger-feedback: uoverskueligt med ~25 kendte
// privilegier og et voksende antal roller). Selve implementeringen ligger
// i roles/PrivilegeMatrix.tsx - denne fil er kun indgangspunktet, så
// AdministrationTab.tsx's import forbliver uændret. Medlemmernes
// rolle-tildeling (US-11) ligger fortsat i en sideordnet fane,
// MembersPanel.tsx.
export function RolesPrivilegesPanel() {
    return <PrivilegeMatrix />
}
