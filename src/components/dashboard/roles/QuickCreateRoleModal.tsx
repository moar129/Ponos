import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { asDynamic } from '../../../i18n/config'
import { readableError } from '../../../ErrorMessage'
import {
    ADMIN_PRIVILEGE,
    KNOWN_PRIVILEGES,
    PRIVILEGE_DOMAINS,
    READ_ROLES_PRIVILEGE,
    ROLE_TEMPLATES,
    privilegeOpLabel,
    useGetMyPrivilegesQuery,
    useGetOrganisationPrivilegesQuery,
    useHasPrivilege,
    type RoleTemplateKey,
} from '../../../store/apis/privilegeApi'
import { useCreateRoleWithPrivilegesMutation, useGetOrganisationRolesQuery } from '../../../store/apis/roleApi'
import type { QuickCreateRoleModalProps } from '../../../types/role/roleType'

type TemplateChoice = RoleTemplateKey | 'copy'

const KNOWN_PRIVILEGE_NAMES = KNOWN_PRIVILEGES.map((p) => p.name)

// Opret en rolle med privilegier uden at forlade det flow man er i (fx
// opret-rum). Skabelonerne giver et fornuftigt udgangspunkt; man kan kun
// give privilegier man selv har - samme regel som RPC'en
// create_role_with_privileges håndhæver server-side.
export function QuickCreateRoleModal({ isOpen, onClose, onCreated, suggestedName = '' }: QuickCreateRoleModalProps) {
    const { t } = useTranslation(['roles', 'common'])
    const td = asDynamic(t)

    const { data: myPrivileges = [], isLoading: loadingMine } = useGetMyPrivilegesQuery()
    const { hasPrivilege: canReadRoles } = useHasPrivilege(READ_ROLES_PRIVILEGE)
    const { data: roles = [] } = useGetOrganisationRolesQuery()
    const { data: orgPrivileges = [] } = useGetOrganisationPrivilegesQuery(undefined, { skip: !canReadRoles })
    const [createRole, { isLoading: creating, error: createError }] = useCreateRoleWithPrivilegesMutation()

    const isAdmin = myPrivileges.includes(ADMIN_PRIVILEGE)
    const canGrant = (name: string) => name !== ADMIN_PRIVILEGE && (isAdmin || myPrivileges.includes(name))
    const grantable = (names: string[]) => names.filter(canGrant)

    const leaderName = (base: string) => (base ? `${base} ${t('quickCreate.leaderSuffix')}` : '')

    const [name, setName] = useState(suggestedName)
    const [nameTouched, setNameTouched] = useState(false)
    const [template, setTemplate] = useState<TemplateChoice>('participant')
    const [copyRoleId, setCopyRoleId] = useState('')
    // null = følg skabelonen; sat, så snart brugeren selv har tilpasset.
    const [customSelection, setCustomSelection] = useState<string[] | null>(null)
    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false)

    if (!isOpen) return null

    const templateSelection = (): string[] => {
        if (template === 'copy') {
            return grantable(
                orgPrivileges
                    .filter((p) => p.roleId === copyRoleId && KNOWN_PRIVILEGE_NAMES.includes(p.name))
                    .map((p) => p.name),
            )
        }
        return grantable(ROLE_TEMPLATES[template])
    }

    const selected = customSelection ?? templateSelection()

    const chooseTemplate = (choice: TemplateChoice) => {
        setTemplate(choice)
        setCustomSelection(null)
        if (!nameTouched && suggestedName) {
            setName(choice === 'leader' ? leaderName(suggestedName) : suggestedName)
        }
    }

    const togglePrivilege = (privilegeName: string) => {
        setCustomSelection(
            selected.includes(privilegeName)
                ? selected.filter((n) => n !== privilegeName)
                : [...selected, privilegeName],
        )
    }

    const handleCreate = async () => {
        try {
            const role = await createRole({ name, privilegeNames: selected }).unwrap()
            onCreated(role)
            onClose()
        } catch {
            // Fejlen vises via createError.
        }
    }

    const submitError = readableError(createError)

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border-gray bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 className="mb-4 text-xl font-semibold text-primary dark:text-slate-100">
                    {t('quickCreate.heading')}
                </h2>

                <div className="space-y-4 overflow-y-auto">
                    <div>
                        <label
                            htmlFor="quick-role-name"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('common:name')}
                        </label>
                        <input
                            id="quick-role-name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setNameTouched(true)
                            }}
                            placeholder={t('matrix.newRoleLabel')}
                            className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            autoFocus
                        />
                    </div>

                    <fieldset>
                        <legend className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400">
                            {t('quickCreate.templateLabel')}
                        </legend>
                        <div className="space-y-1">
                            {(['participant', 'leader'] as const).map((key) => (
                                <label key={key} className="flex cursor-pointer items-start gap-2 text-sm text-primary dark:text-slate-100">
                                    <input
                                        type="radio"
                                        name="quick-role-template"
                                        checked={template === key}
                                        onChange={() => chooseTemplate(key)}
                                        className="mt-0.5 h-4 w-4 shrink-0 border-border-gray text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                                    />
                                    <span>
                                        {t(`quickCreate.template.${key}`)}
                                        <span className="block text-xs text-secondary dark:text-slate-400">
                                            {t(`quickCreate.templateHint.${key}`)}
                                        </span>
                                    </span>
                                </label>
                            ))}

                            {canReadRoles && (
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-primary dark:text-slate-100">
                                    <input
                                        type="radio"
                                        name="quick-role-template"
                                        checked={template === 'copy'}
                                        onChange={() => chooseTemplate('copy')}
                                        className="h-4 w-4 shrink-0 border-border-gray text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                                    />
                                    {t('quickCreate.template.copy')}
                                    <select
                                        value={copyRoleId}
                                        onChange={(e) => {
                                            chooseTemplate('copy')
                                            setCopyRoleId(e.target.value)
                                        }}
                                        className="ml-1 flex-1 rounded-lg border border-border-gray bg-white px-2 py-1 text-sm text-primary focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    >
                                        <option value="">{t('quickCreate.chooseRole')}</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </div>
                    </fieldset>

                    <div>
                        <button
                            type="button"
                            onClick={() => setIsCustomizeOpen((open) => !open)}
                            className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
                        >
                            {isCustomizeOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            {t('quickCreate.customize', { selected: selected.length })}
                        </button>

                        {isCustomizeOpen && (
                            <div className="mt-2 space-y-3 rounded-lg border border-border-gray p-3 dark:border-slate-700">
                                {loadingMine && (
                                    <p className="text-sm text-secondary dark:text-slate-400">{t('common:loading')}</p>
                                )}
                                {PRIVILEGE_DOMAINS.map((domain) => (
                                    <div key={domain.domain}>
                                        <p className="mb-1 text-xs font-semibold uppercase text-secondary dark:text-slate-400">
                                            {td(`roles:domain.${domain.domain}`)}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            {(Object.values(domain.ops) as string[]).map((privilegeName) => {
                                                const allowed = canGrant(privilegeName)
                                                return (
                                                    <label
                                                        key={privilegeName}
                                                        title={allowed ? undefined : t('quickCreate.notOwned')}
                                                        className={`flex items-center gap-1.5 text-sm ${allowed
                                                            ? 'cursor-pointer text-primary dark:text-slate-100'
                                                            : 'cursor-not-allowed text-secondary/60 dark:text-slate-500'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            disabled={!allowed}
                                                            checked={selected.includes(privilegeName)}
                                                            onChange={() => togglePrivilege(privilegeName)}
                                                            className="h-4 w-4 shrink-0 rounded border-border-gray bg-white text-accent focus:ring-accent disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                                                        />
                                                        {privilegeOpLabel(privilegeName, td)}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-secondary dark:text-slate-400">{t('quickCreate.assignHint')}</p>

                    {submitError && (
                        <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={creating || !name.trim() || (template === 'copy' && !copyRoleId && customSelection === null)}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {creating ? t('matrix.creatingRole') : t('matrix.createRole')}
                    </button>
                </div>
            </div>
        </div>
    )
}
