// src/components/dashboard/roles/MatrixCell.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Lock, Pencil, X } from 'lucide-react'
import {
    useCreatePrivilegeMutation,
    useDeletePrivilegeMutation,
    useUpdatePrivilegeMutation,
} from '../../../store/apis/privilegeApi'
import { cellLockState } from './privilegeLocking'
import type { MatrixCellProps } from '../../../types/role/roleType'

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// Én celle i matrixen: rolle × privilegie. Checket = rollen har
// privilegiet. Toggle ER mutationen - intet separat "tilføj"-trin, i
// modsætning til det tidligere dropdown+submit-flow (se
// PrivilegeMatrix.tsx). Fejl på netop denne celle vises lokalt, så én
// fejlet toggle ikke blokerer resten af matrixen. Kun custom-privilegier
// kan omdøbes, og kun for netop denne rolle - se privilegeLocking.ts og
// PrivilegeMatrix.tsx for hvorfor omdøbning ikke synkroniseres på tværs
// af roller, der tilfældigvis deler navn.
export function MatrixCell({ role, privilegeName, privilege, isCustom, isFullAdmin, isProtectedAdminRole }: MatrixCellProps) {
    const [createPrivilege, { isLoading: creating, error: createError }] = useCreatePrivilegeMutation()
    const [deletePrivilege, { isLoading: deleting, error: deleteError }] = useDeletePrivilegeMutation()
    const [updatePrivilege, { isLoading: renaming, error: renameError }] = useUpdatePrivilegeMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(privilegeName)

    const hasPrivilege = !!privilege
    const { locked, reason } = cellLockState(role, privilegeName, hasPrivilege, isFullAdmin, isProtectedAdminRole)
    const busy = creating || deleting || renaming
    const error = readableError(createError) ?? readableError(deleteError) ?? readableError(renameError)

    async function toggle() {
        if (locked || busy) return
        if (privilege) {
            await deletePrivilege(privilege.id)
        } else {
            await createPrivilege({ roleId: role.id, name: privilegeName })
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
                    aria-label="Gem privilegienavn"
                    className="p-0.5 text-secondary hover:text-primary transition-colors dark:text-slate-400 dark:hover:text-slate-100"
                >
                    <Check className="w-3 h-3" />
                </button>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={renaming}
                    aria-label="Annuller"
                    className="p-0.5 text-secondary hover:text-primary transition-colors dark:text-slate-400 dark:hover:text-slate-100"
                >
                    <X className="w-3 h-3" />
                </button>
            </form>
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
                <span title={reason ?? undefined}>
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
                    aria-label="Omdøb privilegie"
                    title={`Omdøb dette privilegie for ${role.name}`}
                    className="absolute left-full ml-1 opacity-0 group-hover/cell:opacity-100 p-0.5 text-secondary hover:text-primary transition-opacity dark:text-slate-400"
                >
                    <Pencil className="w-3 h-3" />
                </button>
            )}
        </div>
    )
}
