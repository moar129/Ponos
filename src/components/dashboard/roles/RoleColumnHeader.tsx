// src/components/dashboard/roles/RoleColumnHeader.tsx
import { readableError } from '../../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Lock, Pencil, Trash2, X } from 'lucide-react'
import { useDeleteRoleMutation, useUpdateRoleMutation } from '../../../store/apis/roleApi'
import type { RoleColumnHeaderProps } from '../../../types/role/roleType'


// Kolonne-header for én rolle: navn + omdøb/slet-inline (samme mønster
// som tidligere RoleCard-header). Uafhængig af celle-lås i
// MatrixCell.tsx - Medlems kolonne er fx låst her (kan ikke omdøbes/
// slettes), mens enkelte celler i kolonnen stadig kan være togglebare.
export function RoleColumnHeader({ role, isLocked, lockedReason }: RoleColumnHeaderProps) {
    const { t } = useTranslation(['roles', 'common', 'errors'])
    const [updateRole, { isLoading: renaming, error: renameError }] = useUpdateRoleMutation()
    const [deleteRole, { isLoading: deleting, error: deleteError }] = useDeleteRoleMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(role.name)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    async function handleRename(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!editName.trim()) return
        try {
            await updateRole({ roleId: role.id, name: editName }).unwrap()
            setIsEditing(false)
        } catch {
            // Fejlen vises via renameError.
        }
    }

    async function handleDelete() {
        try {
            await deleteRole(role.id).unwrap()
        } catch {
            // Fejlen vises via deleteError.
        } finally {
            setConfirmingDelete(false)
        }
    }

    const error = readableError(renameError) ?? readableError(deleteError)

    if (isEditing) {
        return (
            <form onSubmit={handleRename} className="flex items-center gap-1">
                <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="w-24 rounded border border-border-gray bg-white px-1.5 py-1 text-xs text-primary focus:outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                    type="submit"
                    disabled={renaming}
                    aria-label={t('matrix.saveRoleName')}
                    className="p-1 rounded text-secondary hover:bg-bg-gray transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={renaming}
                    aria-label={t('common:cancel')}
                    className="p-1 rounded text-secondary hover:bg-bg-gray transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </form>
        )
    }

    if (confirmingDelete) {
        return (
            <div className="flex flex-col items-start gap-1 text-xs">
                <span className="text-secondary dark:text-slate-400">{t('matrix.confirmDeleteRole', { name: role.name })}</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-red-600 font-medium hover:underline disabled:opacity-60 dark:text-red-400"
                    >
                        {deleting ? t('common:deleting') : t('common:confirmDeleteYes')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        className="text-secondary hover:underline disabled:opacity-60 dark:text-slate-400"
                    >
                        {t('common:cancel')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate max-w-[110px] text-primary dark:text-slate-100" title={role.name}>
                    {role.name}
                </span>
                {isLocked ? (
                    <span title={lockedReason ?? undefined}>
                        <Lock className="w-3.5 h-3.5 text-secondary shrink-0 dark:text-slate-400" />
                    </span>
                ) : (
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setEditName(role.name)
                                setIsEditing(true)
                            }}
                            aria-label={t('matrix.renameRole')}
                            className="p-1 rounded text-secondary hover:bg-bg-gray transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            aria-label={t('matrix.deleteRole')}
                            className="p-1 rounded text-secondary hover:bg-bg-gray transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
            {error && <p className="text-red-600 text-xs dark:text-red-400">{error}</p>}
        </div>
    )
}
