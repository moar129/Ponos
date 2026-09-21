// src/components/dashboard/roles/MatrixRow.tsx
import { MatrixCell } from './MatrixCell'
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { privilegeLabel } from '../../../store/apis/privilegeApi'
import type { MatrixRowProps } from '../../../types/role/roleType'

// Én privilegie-række i matrixen: rækkelabel (sticky venstre kolonne) +
// én celle pr. rolle. Bruges til både kendte katalog-privilegier og
// custom-navne (isCustom afgør om omdøb-ikonet vises i cellerne, se
// MatrixCell.tsx).
export function MatrixRow({ rowName, isCustom, roles, byRoleAndName, isFullAdmin, protectedAdminRoleIds }: MatrixRowProps) {
    const { t } = useTranslation(['roles', 'common', 'errors'])
    const label = privilegeLabel(rowName, asDynamic(t))

    return (
        <tr>
            <td
                className="sticky left-0 z-10 bg-white dark:bg-slate-800 border-b border-r border-border-gray dark:border-slate-700 px-3 py-2 truncate text-primary dark:text-slate-100"
                title={label}
            >
                {label}
            </td>
            {roles.map((role) => (
                <td key={role.id} className="border-b border-r border-border-gray dark:border-slate-700 px-2 py-2 text-center">
                    <MatrixCell
                        role={role}
                        privilegeName={rowName}
                        privilege={byRoleAndName.get(role.id)?.get(rowName)}
                        isCustom={isCustom}
                        isFullAdmin={isFullAdmin}
                        isProtectedAdminRole={protectedAdminRoleIds.has(role.id)}
                        rolePrivileges={byRoleAndName.get(role.id)}
                    />
                </td>
            ))}
        </tr>
    )
}
