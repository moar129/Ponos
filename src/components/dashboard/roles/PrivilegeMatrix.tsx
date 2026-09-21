// src/components/dashboard/roles/PrivilegeMatrix.tsx
import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ADMIN_ROLE_NAME, MEMBER_ROLE_NAME, useCreateRoleMutation, useGetOrganisationRolesQuery } from '../../../store/apis/roleApi'
import {
    ADMIN_PRIVILEGE,
    KNOWN_PRIVILEGES,
    PRIVILEGE_DOMAINS,
    useCreatePrivilegeMutation,
    useGetOrganisationPrivilegesQuery,
    useHasPrivilege,
} from '../../../store/apis/privilegeApi'
import { RoleColumnHeader } from './RoleColumnHeader'
import { MatrixRow } from './MatrixRow'
import { roleColumnLockState } from './privilegeLocking'
import type { Privilege } from '../../../types/role/roleType'

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

const KNOWN_NAMES = new Set(KNOWN_PRIVILEGES.map((p) => p.name))

interface RowGroupDef {
    heading: string | null
    rows: string[]
}

// Roller og privileges (US-12 + US-13) som en matrix: roller som
// kolonner, privilegier som rækker grupperet pr. domæne, checkbokse i
// cellerne. Erstatter det tidligere kort-pr-rolle-layout, som blev
// uoverskueligt med ~25 kendte privilegier og et voksende antal roller -
// man kunne ikke se "hvilke roller har X" uden at åbne hver rolle for
// sig. Medlemmernes rolle-tildeling (US-11) ligger fortsat i en
// sideordnet fane, MembersPanel.tsx. Panelet mountes kun når
// AdministrationTab allerede har bekræftet manage_roles-privilegiet -
// selve adgangen håndhæves stadig server-side af RLS.
export function PrivilegeMatrix() {
    const { data: roles, isLoading: loadingRoles, error: rolesError } = useGetOrganisationRolesQuery()
    const { data: privileges, isLoading: loadingPrivileges, error: privilegesError } = useGetOrganisationPrivilegesQuery()
    const [createRole, { isLoading: creatingRole, error: createRoleError }] = useCreateRoleMutation()
    const [createPrivilege] = useCreatePrivilegeMutation()
    const { hasPrivilege: isFullAdmin } = useHasPrivilege(ADMIN_PRIVILEGE)

    const [newRoleName, setNewRoleName] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)

    const byRoleAndName = useMemo(() => {
        const map = new Map<string, Map<string, Privilege>>()
        for (const p of privileges ?? []) {
            if (!map.has(p.roleId)) map.set(p.roleId, new Map())
            map.get(p.roleId)!.set(p.name, p)
        }
        return map
    }, [privileges])

    // Organisationens indbyggede Admin-rolle (navn Admin + har rent
    // faktisk admin-privilegiet - en anden rolle ved navn "Admin" uden
    // privilegiet, fx til test, låses ikke). Hele kolonnen låses for
    // sådanne roller, se privilegeLocking.ts.
    const protectedAdminRoleIds = useMemo(() => {
        const ids = new Set<string>()
        for (const role of roles ?? []) {
            if (role.name === ADMIN_ROLE_NAME && byRoleAndName.get(role.id)?.has(ADMIN_PRIVILEGE)) {
                ids.add(role.id)
            }
        }
        return ids
    }, [roles, byRoleAndName])

    // Custom-rækker = distinkte navne i orgens data der IKKE findes i
    // KNOWN_PRIVILEGES, unioneret på tværs af alle roller (så ét
    // custom-navn = én række, uanset hvor mange roller der har den). Kan
    // kun opstå ved direkte databaseindsættelse nu - UI'en tilbyder ikke
    // længere at oprette nye (gav ikke mening for brugerne).
    const customPrivilegeNames = useMemo(() => {
        const fromData = (privileges ?? []).map((p) => p.name).filter((n) => !KNOWN_NAMES.has(n))
        return Array.from(new Set(fromData)).sort()
    }, [privileges])

    const rowGroups: RowGroupDef[] = useMemo(() => {
        const groups: RowGroupDef[] = [
            { heading: null, rows: [ADMIN_PRIVILEGE] },
            ...PRIVILEGE_DOMAINS.map((domain) => ({
                heading: domain.domainLabel,
                rows: Object.values(domain.ops) as string[],
            })),
        ]
        if (customPrivilegeNames.length > 0) {
            groups.push({ heading: 'Andet', rows: customPrivilegeNames })
        }
        return groups
    }, [customPrivilegeNames])

    const memberRole = roles?.find((r) => r.name === MEMBER_ROLE_NAME)
    const memberPrivilegeNames = (privileges ?? [])
        .filter((p) => p.roleId === memberRole?.id)
        .map((p) => p.name)

    async function handleCreateRole(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!newRoleName.trim()) {
            setValidationError('Rollens navn skal udfyldes.')
            return
        }
        setValidationError(null)

        try {
            const newRole = await createRole({ name: newRoleName }).unwrap()
            setNewRoleName('')

            if (memberPrivilegeNames.length > 0) {
                await Promise.allSettled(
                    memberPrivilegeNames.map((name) => createPrivilege({ roleId: newRole.id, name }).unwrap()),
                )
            }
        } catch {
            // Fejlen vises via createRoleError.
        }
    }

    const listError = readableError(rolesError) ?? readableError(privilegesError)
    const submitError = validationError ?? readableError(createRoleError)

    return (
        <div>
            <form onSubmit={handleCreateRole} className="flex flex-wrap items-end gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-secondary mb-1 dark:text-slate-400" htmlFor="new-role-name">Ny rolle</label>
                    <input
                        id="new-role-name"
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Fx Frivilligkoordinator"
                        className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={creatingRole}
                    className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {creatingRole ? 'Opretter...' : 'Opret rolle'}
                </button>
            </form>

            {(listError || submitError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    {listError ?? submitError}
                </div>
            )}

            {loadingRoles || loadingPrivileges ? (
                <p className="text-secondary dark:text-slate-400">Indlæser roller...</p>
            ) : !roles || roles.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">Organisationen har endnu ingen roller.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border border-border-gray dark:border-slate-700">
                    {/* table-fixed + colgroup giver faste, deterministiske
                        kolonnebredder - uden det kan browseren regne hver
                        kolonnes bredde ud fra det bredeste indhold i netop
                        den kolonne, hvilket med sticky positionering og
                        varierende celleindhold (lock-ikon vs. checkbox vs.
                        omdøb-knap) fik cellerne til at stå en anelse skævt
                        i forhold til hinanden. */}
                    <table className="table-fixed border-collapse text-sm">
                        <colgroup>
                            <col className="w-56" />
                            {roles.map((role) => (
                                <col key={role.id} className="w-36" />
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="sticky top-0 left-0 z-20 bg-white dark:bg-slate-800 border-b border-r border-border-gray dark:border-slate-700 px-3 py-2 text-left font-medium text-secondary dark:text-slate-400">
                                    Privilegie
                                </th>
                                {roles.map((role) => {
                                    const hasAdmin = byRoleAndName.get(role.id)?.has(ADMIN_PRIVILEGE) ?? false
                                    const { locked, reason } = roleColumnLockState(role, hasAdmin)
                                    return (
                                        <th
                                            key={role.id}
                                            className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-r border-border-gray dark:border-slate-700 px-2 py-2 text-left font-normal"
                                        >
                                            <RoleColumnHeader role={role} isLocked={locked} lockedReason={reason} />
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rowGroups.map((group, groupIndex) => (
                                <RowGroup key={group.heading ?? `group-${groupIndex}`} heading={group.heading} roleCount={roles.length}>
                                    {group.rows.map((rowName) => (
                                        <MatrixRow
                                            key={rowName}
                                            rowName={rowName}
                                            isCustom={!KNOWN_NAMES.has(rowName)}
                                            roles={roles}
                                            byRoleAndName={byRoleAndName}
                                            isFullAdmin={isFullAdmin}
                                            protectedAdminRoleIds={protectedAdminRoleIds}
                                        />
                                    ))}
                                </RowGroup>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// Domæne-overskriftsrække (sticky venstre kolonne, samme mønster som den
// tidligere gruppering i tilføj-dropdownen) - rendres kun når gruppen har
// en overskrift (den ugrupperede admin-række har ingen).
function RowGroup({ heading, roleCount, children }: { heading: string | null; roleCount: number; children: ReactNode }) {
    return (
        <>
            {heading && (
                <tr>
                    <td
                        colSpan={roleCount + 1}
                        className="sticky left-0 border-b border-border-gray dark:border-slate-700 bg-bg-gray dark:bg-slate-700 px-3 py-1 text-xs font-medium uppercase tracking-wide text-secondary dark:text-slate-400"
                    >
                        {heading}
                    </td>
                </tr>
            )}
            {children}
        </>
    )
}
