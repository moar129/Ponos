// src/components/dashboard/roles/MatrixCell.tsx
import { readableError } from '../../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Lock, Pencil, X } from 'lucide-react'
import {
    ADMIN_PRIVILEGE,
    NON_ADMIN_KNOWN_PRIVILEGE_NAMES,
    useCreatePrivilegeMutation,
    useDeletePrivilegeMutation,
    useUpdatePrivilegeMutation,
} from '../../../store/apis/privilegeApi'
import { ADMIN_ROLE_NAME } from '../../../store/apis/roleApi'
import { cellLockState } from './privilegeLocking'
import type { MatrixCellProps } from '../../../types/role/roleType'


// Én celle i matrixen: rolle × privilegie. Checket = rollen har
// privilegiet. Toggle ER mutationen - intet separat "tilføj"-trin, i
// modsætning til det tidligere dropdown+submit-flow (se
// PrivilegeMatrix.tsx). Fejl på netop denne celle vises lokalt, så én
// fejlet toggle ikke blokerer resten af matrixen. Kun custom-privilegier
// kan omdøbes, og kun for netop denne rolle - se privilegeLocking.ts og
// PrivilegeMatrix.tsx for hvorfor omdøbning ikke synkroniseres på tværs
// af roller, der tilfældigvis deler navn.
export function MatrixCell({
    role,
    privilegeName,
    privilege,
    isCustom,
    isFullAdmin,
    isProtectedAdminRole,
    rolePrivileges,
}: MatrixCellProps) {
    const { t } = useTranslation(['roles', 'common', 'errors'])
    const td = asDynamic(t)
    const [createPrivilege, { isLoading: creating, error: createError }] = useCreatePrivilegeMutation()
    const [deletePrivilege, { isLoading: deleting, error: deleteError }] = useDeletePrivilegeMutation()
    const [updatePrivilege, { isLoading: renaming, error: renameError }] = useUpdatePrivilegeMutation()
    const [batchPending, setBatchPending] = useState(false)

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(privilegeName)

    const hasPrivilege = !!privilege
    const { locked, reasonKey } = cellLockState(role, privilegeName, hasPrivilege, isFullAdmin, isProtectedAdminRole)
    const busy = creating || deleting || renaming || batchPending
    const error = readableError(createError) ?? readableError(deleteError) ?? readableError(renameError)

    // Det ægte admin-privilegie (RLS-bypass) er forbeholdt rollen der
    // faktisk hedder Admin (se docs/migrations/2026-09-19-lock-admin-
    // privilege-to-admin-role.sql) - for alle andre roller er admin-
    // rækkens celle i stedet en "Vælg alle/Fjern alle"-knap, der opretter/
    // sletter alle ØVRIGE kendte privilegier på rollen på én gang.
    const isSelectAllRow = privilegeName === ADMIN_PRIVILEGE && role.name !== ADMIN_ROLE_NAME
    const hasAllOthers = NON_ADMIN_KNOWN_PRIVILEGE_NAMES.every((name) => rolePrivileges?.has(name))
    // Dækker det usandsynlige tilfælde hvor rollen allerede har den ægte
    // admin-række fra før migrationen (kun fremadrettet låst, se planen).
    const hasAllOrAdmin = hasPrivilege || hasAllOthers

    async function toggle() {
        if (locked || busy) return
        if (privilege) {
            await deletePrivilege(privilege.id)
        } else {
            await createPrivilege({ roleId: role.id, name: privilegeName })
        }
    }

    async function toggleSelectAll() {
        if (locked || busy) return
        setBatchPending(true)
        try {
            if (hasAllOrAdmin) {
                const idsToDelete: string[] = []
                if (privilege) idsToDelete.push(privilege.id)
                for (const name of NON_ADMIN_KNOWN_PRIVILEGE_NAMES) {
                    const existing = rolePrivileges?.get(name)
                    if (existing) idsToDelete.push(existing.id)
                }
                await Promise.allSettled(idsToDelete.map((id) => deletePrivilege(id).unwrap()))
            } else {
                const namesToCreate = NON_ADMIN_KNOWN_PRIVILEGE_NAMES.filter((name) => !rolePrivileges?.has(name))
                await Promise.allSettled(
                    namesToCreate.map((name) => createPrivilege({ roleId: role.id, name }).unwrap()),
                )
            }
        } finally {
            setBatchPending(false)
        }
    }

    async function handleRename(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!privilege || !editName.trim()) return
        await updatePrivilege({ privilegeId: privilege.id, name: editName })
        setIsEditing(false)
    }

    if (isEditing && privilege) {
        return (
            <form onSubmit={handleRename} className="flex items-center justify-center gap-1">
                <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="w-24 rounded border border-border-gray bg-white px-1 py-0.5 text-xs text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                    type="submit"
                    disabled={renaming}
                    aria-label={t('matrix.savePrivilegeName')}
                    className="p-0.5 text-secondary hover:text-primary transition-colors dark:text-slate-400 dark:hover:text-slate-100"
                >
                    <Check className="w-3 h-3" />
                </button>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={renaming}
                    aria-label={t('common:cancel')}
                    className="p-0.5 text-secondary hover:text-primary transition-colors dark:text-slate-400 dark:hover:text-slate-100"
                >
                    <X className="w-3 h-3" />
                </button>
            </form>
        )
    }

    // Admin-rækkens celle for andre roller end Admin: en knap i stedet for
    // en checkbox. "Checket" ville her være en AFLEDT tilstand (har rollen
    // ALLE øvrige privilegier?) - tvetydigt hvis rollen kun har nogle af
    // dem. En knap med dynamisk label ("Vælg alle"/"Fjern alle") er
    // utvetydig uanset delvis-markeret tilstand.
    if (isSelectAllRow) {
        return (
            <div className="flex items-center justify-center">
                {locked ? (
                    <span title={reasonKey ? td(reasonKey) : undefined}>
                        <Lock className="w-3.5 h-3.5 text-secondary dark:text-slate-500" />
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={toggleSelectAll}
                        disabled={busy}
                        title={
                            error ??
                            (hasAllOrAdmin
                                ? t('matrix.removeAllTitle', { role: role.name })
                                : t('matrix.selectAllTitle', { role: role.name }))
                        }
                        className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            hasAllOrAdmin
                                ? 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30'
                                : 'border-accent text-accent hover:bg-accent/10'
                        } ${error ? 'ring-2 ring-red-400' : ''}`}
                    >
                        {busy ? '...' : hasAllOrAdmin ? t('matrix.removeAll') : t('matrix.selectAll')}
                    </button>
                )}
            </div>
        )
    }

    // Fast bredde/højde + absolut placeret omdøb-knap, så checkboksens
    // centrering er identisk fra celle til celle - ellers rykker
    // checkboksen sig i custom-rækker, alt efter om omdøb-knappen er i
    // DOM'en (kun for tildelte, ulåste custom-privilegier), hvilket gjorde
    // matrixen skæv.
    return (
        <div className="relative flex items-center justify-center h-6 w-6 mx-auto group/cell">
            {locked ? (
                <span title={reasonKey ? td(reasonKey) : undefined}>
                    <Lock className="w-3.5 h-3.5 text-secondary dark:text-slate-500" />
                </span>
            ) : (
                <input
                    type="checkbox"
                    checked={hasPrivilege}
                    disabled={busy}
                    onChange={toggle}
                    aria-label={`${privilegeName} for ${role.name}`}
                    title={error ?? undefined}
                    className={`rounded border-border-gray bg-white text-accent focus:ring-accent disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 ${error ? 'ring-2 ring-red-400' : ''}`}
                />
            )}
            {isCustom && hasPrivilege && !locked && (
                <button
                    type="button"
                    onClick={() => {
                        setEditName(privilegeName)
                        setIsEditing(true)
                    }}
                    aria-label={t('matrix.renamePrivilege')}
                    title={t('matrix.renamePrivilegeFor', { role: role.name })}
                    className="absolute left-full ml-1 opacity-0 group-hover/cell:opacity-100 p-0.5 text-secondary hover:text-primary transition-opacity dark:text-slate-400"
                >
                    <Pencil className="w-3 h-3" />
                </button>
            )}
        </div>
    )
}
