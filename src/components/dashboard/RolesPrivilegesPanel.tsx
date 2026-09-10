// src/components/dashboard/RolesPrivilegesPanel.tsx
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronDown, Lock, Pencil, Trash2, X } from 'lucide-react'
import {
    ADMIN_ROLE_NAME,
    useCreateRoleMutation,
    useDeleteRoleMutation,
    useGetOrganisationRolesQuery,
    useUpdateRoleMutation,
} from '../../store/apis/roleApi'
import {
    ADMIN_PRIVILEGE,
    KNOWN_PRIVILEGES,
    privilegeLabel,
    useCreatePrivilegeMutation,
    useDeletePrivilegeMutation,
    useGetOrganisationPrivilegesQuery,
    useHasPrivilege,
    useUpdatePrivilegeMutation,
} from '../../store/apis/privilegeApi'
import type { PrivilegeRowProps, RoleCardProps } from '../../types/role/roleType'

// Sentinel-værdi for "Andet (indtast selv)..."-valget i privilegie-
// dropdownen - adskilt fra rigtige privilegienavne ved det ugyldige
// tegn, så den aldrig kan kollidere med et faktisk privilegienavn.
const CUSTOM_PRIVILEGE_OPTION = '__custom__'

// Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
// komme i lidt forskellige former afhængigt af hvor fejlen opstod.
function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// Roller og privileges (US-12 + US-13), samlet i ét panel under
// dashboardets Administration-fane (US-65): opret/omdøb/slet roller,
// tilknyt/omdøb/fjern privileges. Medlemmernes rolle-tildeling (US-11)
// ligger i en sideordnet fane, MembersPanel.tsx - tidligere en nestet
// underfane HERINDE, hvilket gav tre niveauer af faner oven i hinanden
// og virkede forvirrende. Panelet mountes kun når AdministrationTab
// allerede har bekræftet manage_roles-privilegiet - selve adgangen
// håndhæves stadig server-side af RLS.
export function RolesPrivilegesPanel() {
    return <RolesSection />
}

// Roller med deres privileges, plus en formular til at oprette en ny
// rolle.
function RolesSection() {
    const { data: roles, isLoading: loadingRoles, error: rolesError } = useGetOrganisationRolesQuery()
    const { data: privileges, isLoading: loadingPrivileges, error: privilegesError } = useGetOrganisationPrivilegesQuery()
    const [createRole, { isLoading: creatingRole, error: createRoleError }] = useCreateRoleMutation()

    const [newRoleName, setNewRoleName] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)

    async function handleCreateRole(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!newRoleName.trim()) {
            setValidationError('Rollens navn skal udfyldes.')
            return
        }
        setValidationError(null)

        try {
            await createRole({ name: newRoleName }).unwrap()
            setNewRoleName('')
        } catch {
            // Fejlen vises via createRoleError.
        }
    }

    const listError = readableError(rolesError) ?? readableError(privilegesError)
    const submitError = validationError ?? readableError(createRoleError)

    return (
        <div>
            <form onSubmit={handleCreateRole} className="flex flex-wrap items-end gap-3 mb-6">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-secondary mb-1" htmlFor="new-role-name">Ny rolle</label>
                    <input
                        id="new-role-name"
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Fx Frivilligkoordinator"
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <button
                    type="submit"
                    disabled={creatingRole}
                    className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {creatingRole ? 'Opretter...' : 'Opret rolle'}
                </button>
            </form>

            {(listError || submitError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {listError ?? submitError}
                </div>
            )}

            {loadingRoles || loadingPrivileges ? (
                <p className="text-secondary">Indlæser roller...</p>
            ) : !roles || roles.length === 0 ? (
                <p className="text-secondary">Organisationen har endnu ingen roller.</p>
            ) : (
                <ul className="space-y-4">
                    {roles.map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            privileges={(privileges ?? []).filter((p) => p.roleId === role.id)}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

// Én rolle: navn (omdøbes/slettes inline), dens tilknyttede privileges,
// plus en lille formular til at tilføje endnu et privilege.
function RoleCard({ role, privileges }: RoleCardProps) {
    // Kun organisationens indbyggede "Admin"-rolle med admin-privilegiet
    // er låst mod omdøb/slet: sletning af netop den ville kaskade-slette
    // selve admin-privilegiet (privileges.role_id ... on delete cascade)
    // og låse alle administratorer ude af organisationen. Andre roller må
    // frit have admin-privilegiet (fx til test) uden at blive låst.
    // Matcher databasens prevent_admin_role_change-trigger.
    const isAdminRole = role.name === ADMIN_ROLE_NAME && privileges.some((p) => p.name === ADMIN_PRIVILEGE)

    const [updateRole, { isLoading: renaming, error: renameError }] = useUpdateRoleMutation()
    const [deleteRole, { isLoading: deleting, error: deleteError }] = useDeleteRoleMutation()
    const [createPrivilege] = useCreatePrivilegeMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(role.name)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([])
    const [customPrivilegeName, setCustomPrivilegeName] = useState('')
    const [privilegeFormError, setPrivilegeFormError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    // Kun rigtige administratorer må se/vælge "Fuld administrator" - en
    // bruger med fx kun manage_roles ville alligevel blive afvist af
    // RLS'ens escalation-guard, så vi tilbyder den ikke i UI'en.
    const { hasPrivilege: isFullAdmin } = useHasPrivilege(ADMIN_PRIVILEGE)

    // Kun de kendte privilegier, rollen ikke allerede har - undgår at
    // friste til et dublet-forsøg, som RLS/unique-constraint alligevel
    // ville afvise. "Andet" er altid med sidst, så man kan skrive et
    // custom privilegienavn (US-13 er skrevet generisk).
    const availablePrivileges = KNOWN_PRIVILEGES.filter(
        (known) =>
            !privileges.some((existing) => existing.name === known.name) &&
            (known.name !== ADMIN_PRIVILEGE || isFullAdmin),
    )
    const pickerOptions = [...availablePrivileges, { name: CUSTOM_PRIVILEGE_OPTION, label: 'Andet (indtast selv)...' }]

    function togglePrivilege(name: string) {
        setSelectedPrivileges((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
    }

    // Dropdown med tjekbokse i stedet for en almindelig <select> - en
    // multi-select kræver ctrl+klik i en native select, hvilket ingen
    // finder ud af. Samme åbn/luk-mønster som brugermenuen i headeren.
    const [pickerOpen, setPickerOpen] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!pickerOpen) return

        function handlePointerDown(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setPickerOpen(false)
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setPickerOpen(false)
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [pickerOpen])

    function optionLabel(name: string): string {
        return name === CUSTOM_PRIVILEGE_OPTION ? 'Andet (indtast selv)...' : privilegeLabel(name)
    }

    const pickerButtonLabel =
        selectedPrivileges.length === 0
            ? 'Vælg privilegier'
            : selectedPrivileges.length === 1
                ? optionLabel(selectedPrivileges[0])
                : `${selectedPrivileges.length} privilegier valgt`

    function startEdit() {
        setEditName(role.name)
        setIsEditing(true)
    }

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

    async function handleCreatePrivileges(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const wantsCustom = selectedPrivileges.includes(CUSTOM_PRIVILEGE_OPTION)
        const customTrimmed = customPrivilegeName.trim()
        const knownSelected = selectedPrivileges.filter((name) => name !== CUSTOM_PRIVILEGE_OPTION)

        if (knownSelected.length === 0 && !wantsCustom) {
            setPrivilegeFormError('Vælg mindst ét privilegie.')
            return
        }
        if (wantsCustom && !customTrimmed) {
            setPrivilegeFormError('Skriv navnet på det custom privilegie.')
            return
        }
        setPrivilegeFormError(null)
        setCreating(true)

        const names = wantsCustom ? [...knownSelected, customTrimmed] : knownSelected

        // Flere privilegier kan vælges på én gang - sendes som separate
        // kald (createPrivilege tager ét ad gangen), men afvikles parallelt
        // og fejl samles op i stedet for at stoppe ved den første.
        const results = await Promise.allSettled(
            names.map((name) => createPrivilege({ roleId: role.id, name }).unwrap()),
        )

        const failures = results
            .map((result, index) => (result.status === 'rejected' ? { name: names[index], reason: result.reason } : null))
            .filter((failure): failure is { name: string; reason: unknown } => failure !== null)

        if (failures.length === 0) {
            setSelectedPrivileges([])
            setCustomPrivilegeName('')
        } else {
            setPrivilegeFormError(
                failures
                    .map((failure) => `${privilegeLabel(failure.name)}: ${readableError(failure.reason) ?? 'Ukendt fejl'}`)
                    .join(' '),
            )
        }
        setCreating(false)
    }

    return (
        <li className="border border-border-gray rounded-md p-4">
            {isEditing ? (
                <form onSubmit={handleRename} className="flex items-center gap-2 mb-2">
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="flex-1 rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                        type="submit"
                        disabled={renaming}
                        aria-label="Gem rollenavn"
                        className="p-1.5 rounded-md text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        disabled={renaming}
                        aria-label="Annuller"
                        className="p-1.5 rounded-md text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </form>
            ) : confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <p className="text-sm text-secondary">
                        Slet rollen "{role.name}"? Tilknyttede privilegier fjernes også, og medlemmer med rollen mister den.
                    </p>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-primary text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                        {deleting ? 'Sletter...' : 'Ja, slet'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        Annuller
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-medium">{role.name}</p>
                    {isAdminRole ? (
                        <span
                            className="flex items-center gap-1 text-xs text-secondary italic"
                            title="Denne rolle har admin-privilegiet og kan ikke omdøbes eller slettes"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            Låst
                        </span>
                    ) : (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={startEdit}
                                aria-label="Omdøb rolle"
                                className="p-1.5 rounded-md text-secondary hover:bg-bg-gray transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingDelete(true)}
                                aria-label="Slet rolle"
                                className="p-1.5 rounded-md text-secondary hover:bg-bg-gray transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(readableError(renameError) || readableError(deleteError)) && (
                <p className="text-red-700 text-xs mb-2">
                    {readableError(renameError) ?? readableError(deleteError)}
                </p>
            )}

            {privileges.length === 0 ? (
                <p className="text-sm text-secondary mb-3">Ingen privilegier endnu.</p>
            ) : (
                <ul className="space-y-1 mb-3">
                    {privileges.map((privilege) => (
                        <PrivilegeRow key={privilege.id} privilege={privilege} roleName={role.name} />
                    ))}
                </ul>
            )}

            <form onSubmit={handleCreatePrivileges} className="flex flex-col gap-2">
                <div className="relative inline-block" ref={pickerRef}>
                    <button
                        type="button"
                        onClick={() => setPickerOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={pickerOpen}
                        className="flex items-center justify-between gap-2 min-w-[220px] rounded-md border border-border-gray px-3 py-1.5 text-sm text-left text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <span>{pickerButtonLabel}</span>
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {pickerOpen && (
                        <div
                            role="listbox"
                            className="absolute left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto rounded-md bg-white shadow-lg border border-border-gray py-1 z-10"
                        >
                            {pickerOptions.map((p) => (
                                <label
                                    key={p.name}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:bg-bg-gray cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPrivileges.includes(p.name)}
                                        onChange={() => togglePrivilege(p.name)}
                                        className="rounded border-border-gray"
                                    />
                                    {p.label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                    {selectedPrivileges.includes(CUSTOM_PRIVILEGE_OPTION) && (
                        <input
                            type="text"
                            value={customPrivilegeName}
                            onChange={(e) => setCustomPrivilegeName(e.target.value)}
                            placeholder="Fx custom_privilegie"
                            autoFocus
                            className="flex-1 min-w-[160px] rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    )}
                    <button
                        type="submit"
                        disabled={creating}
                        className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        {creating ? 'Tilføjer...' : 'Tilføj privilegie(r)'}
                    </button>
                </div>
            </form>

            {privilegeFormError && <p className="text-red-700 text-xs mt-2">{privilegeFormError}</p>}
        </li>
    )
}

// Ét privilege: navn (omdøbes/fjernes inline).
function PrivilegeRow({ privilege, roleName }: PrivilegeRowProps) {
    const [updatePrivilege, { isLoading: renaming, error: renameError }] = useUpdatePrivilegeMutation()
    const [deletePrivilege, { isLoading: deleting, error: deleteError }] = useDeletePrivilegeMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(privilege.name)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    function startEdit() {
        setEditName(privilege.name)
        setIsEditing(true)
    }

    async function handleRename(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!editName.trim()) return

        try {
            await updatePrivilege({ privilegeId: privilege.id, name: editName }).unwrap()
            setIsEditing(false)
        } catch {
            // Fejlen vises via renameError.
        }
    }

    async function handleDelete() {
        try {
            await deletePrivilege(privilege.id).unwrap()
        } catch {
            // Fejlen vises via deleteError.
        } finally {
            setConfirmingDelete(false)
        }
    }

    const error = readableError(renameError) ?? readableError(deleteError)

    if (isEditing) {
        return (
            <li>
                <form onSubmit={handleRename} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="flex-1 rounded-md border border-border-gray px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                        type="submit"
                        disabled={renaming}
                        aria-label="Gem privilegienavn"
                        className="p-1 rounded-md text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        disabled={renaming}
                        aria-label="Annuller"
                        className="p-1 rounded-md text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </form>
                {error && <p className="text-red-700 text-xs mt-1">{error}</p>}
            </li>
        )
    }

    if (confirmingDelete) {
        return (
            <li className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary">Fjern privilegiet "{privilege.name}"?</span>
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-700 font-medium hover:underline disabled:opacity-60"
                >
                    {deleting ? 'Fjerner...' : 'Ja, fjern'}
                </button>
                <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="text-secondary hover:underline disabled:opacity-60"
                >
                    Annuller
                </button>
                {error && <p className="text-red-700 text-xs w-full">{error}</p>}
            </li>
        )
    }

    // Kun admin-privilegiet på organisationens "Admin"-rolle er låst -
    // se isAdminRole i RoleCard for begrundelsen. Samme privilege-navn på
    // en anden rolle (fx en testrolle) må frit omdøbes/fjernes.
    const isAdminPrivilege = privilege.name === ADMIN_PRIVILEGE && roleName === ADMIN_ROLE_NAME

    return (
        <li className="flex items-center justify-between gap-2 text-sm bg-bg-gray text-secondary rounded-md px-3 py-1">
            <span>{privilegeLabel(privilege.name)}</span>
            {isAdminPrivilege ? (
                <span className="flex items-center gap-1 text-xs italic" title="Admin-privilegiet kan ikke omdøbes eller fjernes">
                    <Lock className="w-3.5 h-3.5" />
                </span>
            ) : (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={startEdit}
                        aria-label="Omdøb privilegie"
                        className="p-1 rounded-md hover:bg-white transition-colors"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        aria-label="Fjern privilegie"
                        className="p-1 rounded-md hover:bg-white transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </li>
    )
}

