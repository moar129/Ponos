// src/components/dashboard/MembersPanel.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import {
    useAssignRoleMutation,
    useGetOrganisationMembersQuery,
    useGetOrganisationRolesQuery,
    useRemoveMemberMutation,
    useTransferAdminRoleMutation,
} from '../../store/apis/roleApi'
import {
    ADMIN_PRIVILEGE,
    adminRoleIdsOf,
    DELETE_MEMBERS_PRIVILEGE,
    UPDATE_ROLES_PRIVILEGE,
    useGetOrganisationPrivilegesQuery,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import type { OrganisationMember } from '../../types/role/roleType'
import { filterPeople, formatFullName } from '../../utils/personName'
import { Alert } from '../common/Alert'
import { InlineConfirm } from '../common/InlineConfirm'

// Organisationens medlemmer (US-11 + US-66), med en dropdown pr. medlem
// til at tildele/fjerne en rolle, og en knap til at fjerne medlemmet fra
// organisationen. Egen underfane under dashboardets Administration-fane
// (US-65) - tidligere nestet som en underfane INDE i "Roller &
// privilegier"-panelet, hvilket gav tre niveauer af faner oven i
// hinanden og virkede forvirrende; nu en sideordnet fane i stedet.
// Rolle-dropdownen og "Fjern"-knappen er uafhængigt privilegie-gatede
// (update_roles hhv. delete_members, Fase 3) - en bruger kan have det
// ene uden det andet.
export function MembersPanel() {
    const { t } = useTranslation(['organisation', 'common'])
    const { data: myProfile } = useGetMyProfileQuery()
    const { data: members, isLoading: loadingMembers, error: membersError } = useGetOrganisationMembersQuery()
    const { data: roles } = useGetOrganisationRolesQuery()
    const { data: privileges } = useGetOrganisationPrivilegesQuery()
    const { hasPrivilege: canManageRoles } = useHasPrivilege(UPDATE_ROLES_PRIVILEGE)
    const { hasPrivilege: canManageMembers } = useHasPrivilege(DELETE_MEMBERS_PRIVILEGE)
    const { hasPrivilege: isFullAdmin } = useHasPrivilege(ADMIN_PRIVILEGE)
    const [assignRole, { error: assignError }] = useAssignRoleMutation()
    const [removeMember, { error: removeError }] = useRemoveMemberMutation()
    const [transferAdminRole, { error: transferError }] = useTransferAdminRoleMutation()
    const [savingUserId, setSavingUserId] = useState<string | null>(null)
    const [removingUserId, setRemovingUserId] = useState<string | null>(null)
    const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)
    const [pendingTransferId, setPendingTransferId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const currentUserId = myProfile?.id ?? null

    // Medlemmer, hvis rolle bærer admin-privilegiet - bruges til at skjule
    // "Fjern" for en manage_members-holder, der ikke selv er fuld admin
    // (matcher escalation-guarden i remove_member-RPC'en server-side), og
    // til at afgøre om et rolleskift reelt er et admin-hand-off.
    const roleIdsWithAdmin = adminRoleIdsOf(privileges ?? [])

    // Kun én admin ad gangen (databasens
    // prevent_non_admin_role_change_on_admin_membership håndhæver det).
    // At vælge en admin-bærende rolle i dropdownen er derfor et hand-off,
    // ikke en almindelig tildeling - kræver bekræftelse, fordi man selv
    // straks mister admin-adgangen (transfer_admin_role, dbSchema.sql).
    function handleAssign(member: OrganisationMember, roleId: string) {
        if (roleIdsWithAdmin.has(roleId)) {
            setPendingTransferId(member.id)
            return
        }
        void doAssign(member, roleId)
    }

    async function doAssign(member: OrganisationMember, roleId: string) {
        setSavingUserId(member.id)
        try {
            await assignRole({ userId: member.id, roleId }).unwrap()
        } catch {
            // Fejlen vises via assignError.
        } finally {
            setSavingUserId(null)
        }
    }

    async function handleConfirmTransfer(member: OrganisationMember) {
        setSavingUserId(member.id)
        try {
            await transferAdminRole({ userId: member.id }).unwrap()
        } catch {
            // Fejlen vises via transferError.
        } finally {
            setSavingUserId(null)
            setPendingTransferId(null)
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

    const listError = readableError(membersError)
    const actionError = readableError(assignError) ?? readableError(removeError) ?? readableError(transferError)

    if (loadingMembers) {
        return <p className="text-secondary dark:text-slate-400">{t('members.loading')}</p>
    }

    if (listError) {
        return <Alert>{listError}</Alert>
    }

    if (!members || members.length === 0) {
        return <p className="text-secondary dark:text-slate-400">{t('members.empty')}</p>
    }

    const filteredMembers = filterPeople(members, searchTerm)
        // Den indloggede bruger ligger altid øverst, uanset søgning - .sort()
        // er stabil, så resten beholder deres eksisterende rækkefølge
        // (server-sorteret på fornavn).
        .sort((a, b) => {
            if (a.id === currentUserId) return -1
            if (b.id === currentUserId) return 1
            return 0
        })

    return (
        <div>
            <Alert className="mb-4">{actionError}</Alert>

            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('members.searchPlaceholder')}
                className="w-full max-w-sm mb-4 rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />

            {filteredMembers.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('members.noMatch')}</p>
            ) : (
            <ul className="divide-y divide-border-gray border-t border-border-gray dark:divide-slate-700 dark:border-slate-700">
                {filteredMembers.map((member) => {
                    const isSelf = member.id === currentUserId
                    const memberIsAdmin = member.roleId !== null && roleIdsWithAdmin.has(member.roleId)
                    const canRemoveThisMember = canManageMembers && (!memberIsAdmin || isFullAdmin)

                    return (
                        <li key={member.id} className="py-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium">{formatFullName(member.firstName, member.lastName)}</p>
                                    <p className="text-sm text-secondary dark:text-slate-400">{member.email}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isSelf ? (
                                        <p className="text-sm text-secondary italic dark:text-slate-400">{t('members.ownRow')}</p>
                                    ) : (
                                        <>
                                            {canManageRoles && (
                                                memberIsAdmin && !isFullAdmin ? (
                                                    <span
                                                        className="flex items-center gap-1 text-xs text-secondary italic dark:text-slate-400"
                                                        title={t('members.adminLockedTitle')}
                                                    >
                                                        <Lock className="w-3.5 h-3.5" />
                                                        {t('members.locked')}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={member.roleId ?? ''}
                                                        onChange={(e) => handleAssign(member, e.target.value)}
                                                        disabled={savingUserId === member.id}
                                                        className="rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    >
                                                        {(roles ?? []).map((role) => (
                                                            <option key={role.id} value={role.id}>{role.name}</option>
                                                        ))}
                                                    </select>
                                                )
                                            )}

                                            {canRemoveThisMember && confirmingRemoveId !== member.id && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingRemoveId(member.id)}
                                                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                                >
                                                    {t('common:remove')}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {confirmingRemoveId === member.id && (
                                <div className="mt-2">
                                    <InlineConfirm
                                        question={t('members.confirmRemove', { name: formatFullName(member.firstName, member.lastName) })}
                                        confirmLabel={t('members.confirmRemoveYes')}
                                        loadingLabel={t('members.removing')}
                                        isLoading={removingUserId === member.id}
                                        onConfirm={() => handleRemove(member)}
                                        onCancel={() => setConfirmingRemoveId(null)}
                                    />
                                </div>
                            )}

                            {pendingTransferId === member.id && (
                                <div className="mt-2">
                                    <InlineConfirm
                                        question={t('members.confirmTransfer', { name: formatFullName(member.firstName, member.lastName) })}
                                        confirmLabel={t('members.confirmTransferYes')}
                                        loadingLabel={t('members.transferring')}
                                        isLoading={savingUserId === member.id}
                                        onConfirm={() => handleConfirmTransfer(member)}
                                        onCancel={() => setPendingTransferId(null)}
                                    />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
            )}
        </div>
    )
}
