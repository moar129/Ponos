import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react';
import { useGetOrganisationRolesQuery } from '../../store/apis/roleApi';
import { CREATE_ROLES_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi';
import { QuickCreateRoleModal } from '../dashboard/roles/QuickCreateRoleModal';
import type { RoomRolePickerProps } from '../../types/Task/Task';

// Vælg hvilke roller der har adgang til et rum. Ingen valgt = åbent for
// alle. UI-hjælp kun - adgangen håndhæves af RLS (can_access_task_room).
export function RoomRolePicker({
    selectedRoleIds,
    onChange,
    disabled = false,
    suggestedRoleName,
}: RoomRolePickerProps) {
  const { t } = useTranslation(['tasks'])
    const { data: roles = [], isLoading, isError } = useGetOrganisationRolesQuery();
    const { hasPrivilege: canCreateRole } = useHasPrivilege(CREATE_ROLES_PRIVILEGE);
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);

    const toggle = (roleId: string) => {
        onChange(
            selectedRoleIds.includes(roleId)
                ? selectedRoleIds.filter((id) => id !== roleId)
                : [...selectedRoleIds, roleId]
        );
    };

    return (
        <fieldset disabled={disabled}>
            <legend className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400">
                {t('rooms.rolesLabel')}
            </legend>
            <p className="mb-2 text-xs text-secondary dark:text-slate-400">
                {t('rooms.rolesHint')}
            </p>

            {isLoading && (
                <p className="text-sm text-secondary dark:text-slate-400">{t('rooms.rolesLoading')}</p>
            )}

            {isError && (
                <p className="text-sm text-red-700 dark:text-red-400">{t('rooms.rolesLoadFailed')}</p>
            )}

            {!isLoading && !isError && roles.length === 0 && (
                <p className="text-sm text-secondary dark:text-slate-400">{t('rooms.noRoles')}</p>
            )}

            {roles.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border-gray p-2 dark:border-slate-700">
                    {roles.map((role) => (
                        <label
                            key={role.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-primary hover:bg-bg-gray dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                            <input
                                type="checkbox"
                                checked={selectedRoleIds.includes(role.id)}
                                onChange={() => toggle(role.id)}
                                className="h-4 w-4 shrink-0 rounded border-border-gray bg-white text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                            />
                            {role.name}
                        </label>
                    ))}
                </div>
            )}

            {canCreateRole && (
                <button
                    type="button"
                    onClick={() => setIsCreateRoleOpen(true)}
                    className="mt-2 flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus size={16} />
                    {t('rooms.newRole')}
                </button>
            )}

            {isCreateRoleOpen && (
                <QuickCreateRoleModal
                    isOpen
                    onClose={() => setIsCreateRoleOpen(false)}
                    onCreated={(role) => onChange([...selectedRoleIds, role.id])}
                    suggestedName={suggestedRoleName?.trim()}
                />
            )}
        </fieldset>
    );
}
