// src/components/dashboard/MembersPanel.tsx
import { useState } from 'react'
import {
    useAssignRoleMutation,
    useGetOrganisationMembersQuery,
    useGetOrganisationRolesQuery,
    useRemoveMemberMutation,
} from '../../store/apis/roleApi'
import {
    ADMIN_PRIVILEGE,
    MANAGE_MEMBERS_PRIVILEGE,
    MANAGE_ROLES_PRIVILEGE,
    useGetOrganisationPrivilegesQuery,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
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

// Organisationens medlemmer (US-11 + US-66), med en dropdown pr. medlem
// til at tildele/fjerne en rolle, og en knap til at fjerne medlemmet fra
// organisationen. Egen underfane under dashboardets Administration-fane
// (US-65) - tidligere nestet som en underfane INDE i "Roller &
// privilegier"-panelet, hvilket gav tre niveauer af faner oven i
// hinanden og virkede forvirrende; nu en sideordnet fane i stedet.
// Rolle-dropdownen og "Fjern"-knappen er uafhængigt privilegie-gatede
// (manage_roles hhv. manage_members) - en bruger kan have det ene uden
// det andet.
export function MembersPanel() {
    const { data: myProfile } = useGetMyProfileQuery()
    const { data: members, isLoading: loadingMembers, error: membersError } = useGetOrganisationMembersQuery()
    const { data: roles } = useGetOrganisationRolesQuery()
    const { data: privileges } = useGetOrganisationPrivilegesQuery()
    const { hasPrivilege: canManageRoles } = useHasPrivilege(MANAGE_ROLES_PRIVILEGE)
    const { hasPrivilege: canManageMembers } = useHasPrivilege(MANAGE_MEMBERS_PRIVILEGE)
    const { hasPrivilege: isFullAdmin } = useHasPrivilege(ADMIN_PRIVILEGE)
    const [assignRole, { error: assignError }] = useAssignRoleMutation()
    const [removeMember, { error: removeError }] = useRemoveMemberMutation()
    const [savingUserId, setSavingUserId] = useState<string | null>(null)
    const [removingUserId, setRemovingUserId] = useState<string | null>(null)
    const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)

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

    async function handleRemove(member: OrganisationMember) {
        setRemovingUserId(member.id)
        try {
            await removeMember(member.id).unwrap()
        } catch {
            // Fejlen vises via removeError.
        } finally {
            setRemovingUserId(null)
            setConfirmingRemoveId(null)
        }
    }

    // Medlemmer, hvis rolle bærer admin-privilegiet - bruges til at skjule
    // "Fjern" for en manage_members-holder, der ikke selv er fuld admin
    // (matcher escalation-guarden i remove_member-RPC'en server-side).
    const roleIdsWithAdmin = new Set((privileges ?? []).filter((p) => p.name === ADMIN_PRIVILEGE).map((p) => p.roleId))

    const listError = readableError(membersError)
    const actionError = readableError(assignError) ?? readableError(removeError)

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
                    const memberIsAdmin = member.roleId !== null && roleIdsWithAdmin.has(member.roleId)
                    const canRemoveThisMember = canManageMembers && (!memberIsAdmin || isFullAdmin)

                    return (
                        <li key={member.id} className="py-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium">{member.firstName} {member.lastName}</p>
                                    <p className="text-sm text-secondary">{member.email}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isSelf ? (
                                        <p className="text-sm text-secondary italic">Du kan ikke ændre din egen række</p>
                                    ) : (
                                        <>
                                            {canManageRoles && (
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

                                            {canRemoveThisMember && confirmingRemoveId !== member.id && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingRemoveId(member.id)}
                                                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                                                >
                                                    Fjern
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {confirmingRemoveId === member.id && (
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                    <span className="text-sm text-secondary">
                                        Er du sikker på at du vil fjerne {member.firstName} {member.lastName} fra organisationen?
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(member)}
                                        disabled={removingUserId === member.id}
                                        className="text-red-700 text-sm font-medium hover:underline disabled:opacity-60"
                                    >
                                        {removingUserId === member.id ? 'Fjerner...' : 'Ja, fjern'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingRemoveId(null)}
                                        disabled={removingUserId === member.id}
                                        className="text-secondary text-sm hover:underline disabled:opacity-60"
                                    >
                                        Annuller
                                    </button>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
