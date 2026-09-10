// src/components/dashboard/MembersPanel.tsx
import { useState } from 'react'
import { useAssignRoleMutation, useGetOrganisationMembersQuery, useGetOrganisationRolesQuery } from '../../store/apis/roleApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import type { OrganisationMember } from '../../types/role/roleType'

// Sentinel-værdi for "Standard medlem (ingen rolle)" i rolle-tildelings-
// dropdownen - vælges roleId sættes til null (fjerner rollen helt).
const NO_ROLE_OPTION = '__none__'

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// Organisationens medlemmer (US-11), med en dropdown pr. medlem til at
// tildele/fjerne en rolle. Egen underfane under dashboardets
// Administration-fane (US-65) - tidligere nestet som en underfane INDE i
// "Roller & privilegier"-panelet, hvilket gav tre niveauer af faner
// oven i hinanden og virkede forvirrende; nu en sideordnet fane i stedet.
// Den indloggede administrators egen række er skrivebeskyttet - databasen
// blokerer selv-tildeling, men UI'en undgår at vise kontrollen for ikke
// at friste til et forsøg, der alligevel fejler.
export function MembersPanel() {
    const { data: myProfile } = useGetMyProfileQuery()
    const { data: members, isLoading: loadingMembers, error: membersError } = useGetOrganisationMembersQuery()
    const { data: roles } = useGetOrganisationRolesQuery()
    const [assignRole, { error: assignError }] = useAssignRoleMutation()
    const [savingUserId, setSavingUserId] = useState<string | null>(null)

    const currentUserId = myProfile?.id ?? null

    async function handleAssign(member: OrganisationMember, value: string) {
        const roleId = value === NO_ROLE_OPTION ? null : value
        setSavingUserId(member.id)
        try {
            await assignRole({ userId: member.id, roleId }).unwrap()
        } catch {
            // Fejlen vises via assignError.
        } finally {
            setSavingUserId(null)
        }
    }

    const listError = readableError(membersError)
    const actionError = readableError(assignError)

    if (loadingMembers) {
        return <p className="text-secondary">Indlæser medlemmer...</p>
    }

    if (listError) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {listError}
            </div>
        )
    }

    if (!members || members.length === 0) {
        return <p className="text-secondary">Organisationen har ingen medlemmer endnu.</p>
    }

    return (
        <div>
            {actionError && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {actionError}
                </div>
            )}

            <ul className="divide-y divide-border-gray border-t border-border-gray">
                {members.map((member) => {
                    const isSelf = member.id === currentUserId

                    return (
                        <li key={member.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">{member.firstName} {member.lastName}</p>
                                <p className="text-sm text-secondary">{member.email}</p>
                            </div>

                            {isSelf ? (
                                <p className="text-sm text-secondary italic">Du kan ikke tildele dig selv en rolle</p>
                            ) : (
                                <select
                                    value={member.roleId ?? NO_ROLE_OPTION}
                                    onChange={(e) => handleAssign(member, e.target.value)}
                                    disabled={savingUserId === member.id}
                                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                                >
                                    <option value={NO_ROLE_OPTION}>Standard medlem (ingen rolle)</option>
                                    {(roles ?? []).map((role) => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
