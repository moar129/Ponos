// src/pages/roles/RolesPage.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Lock, Pencil, ShieldCheck, Trash2, X } from 'lucide-react'
import {
    ADMIN_ROLE_NAME,
    useAssignRoleMutation,
    useCreateRoleMutation,
    useDeleteRoleMutation,
    useGetOrganisationMembersQuery,
    useGetOrganisationRolesQuery,
    useUpdateRoleMutation,
} from '../../store/apis/roleApi'
import {
    ADMIN_PRIVILEGE,
    KNOWN_PRIVILEGES,
    MANAGE_ROLES_PRIVILEGE,
    privilegeLabel,
    useCreatePrivilegeMutation,
    useDeletePrivilegeMutation,
    useGetOrganisationPrivilegesQuery,
    useHasPrivilege,
    useUpdatePrivilegeMutation,
} from '../../store/apis/privilegeApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import type { OrganisationMember, Privilege, Role } from '../../types/role/roleType'

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

// Roller og privileges (US-11 + US-12 + US-13), samlet på én
// admin-side: opret/omdøb/slet roller, tilknyt/omdøb/fjern privileges,
// og tildel roller til organisationens medlemmer. Adgangen håndhæves
// server-side af RLS - tjekket her er kun for at undgå at vise siden
// til brugere uden rettigheder.
export default function RolesPage() {
    const { hasPrivilege: canManageRoles, isLoading: loadingPrivileges } = useHasPrivilege(MANAGE_ROLES_PRIVILEGE)
    const { data: myProfile } = useGetMyProfileQuery()

    if (loadingPrivileges) {
        return <p className="text-secondary">Indlæser...</p>
    }

    if (!canManageRoles) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-2">Ingen adgang</h1>
                <p className="text-sm text-secondary">
                    Du har ikke rettigheder til at administrere roller og privilegier.
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-secondary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-primary">Roller & privilegier</h1>
                    <p className="text-sm text-secondary">
                        Opret roller, tilknyt privilegier, og tildel roller til organisationens medlemmer.
                    </p>
                </div>
            </div>

            <RolesAndMembersTabs currentUserId={myProfile?.id ?? null} />
        </div>
    )
}

interface RolesAndMembersTabsProps {
    currentUserId: string | null
}

// To faner i stedet for to store bokse oven på hinanden: administratoren
// arbejder typisk med enten roller/privilegier eller medlemmer ad gangen,
// så kun ét afsnit vises fremfor at man skal scrolle forbi det andet.
function RolesAndMembersTabs({ currentUserId }: RolesAndMembersTabsProps) {
    const [activeTab, setActiveTab] = useState<'roles' | 'members'>('roles')

    const tabClass = (tab: 'roles' | 'members') =>
        `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
            ? 'border-primary text-primary'
            : 'border-transparent text-secondary hover:text-primary'
        }`

    return (
        <div>
            <div className="flex gap-2 border-b border-border-gray mb-6">
                <button type="button" onClick={() => setActiveTab('roles')} className={tabClass('roles')}>
                    Roller & privilegier
                </button>
                <button type="button" onClick={() => setActiveTab('members')} className={tabClass('members')}>
                    Medlemmer
                </button>
            </div>

            {activeTab === 'roles' ? <RolesSection /> : <MembersSection currentUserId={currentUserId} />}
        </div>
    )
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

interface RoleCardProps {
    role: Role
    privileges: Privilege[]
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
    const [createPrivilege, { isLoading: creating, error: createError }] = useCreatePrivilegeMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(role.name)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const [selectedPrivilege, setSelectedPrivilege] = useState('')
    const [customPrivilegeName, setCustomPrivilegeName] = useState('')
    const [privilegeValidationError, setPrivilegeValidationError] = useState<string | null>(null)

    // Kun de kendte privilegier, rollen ikke allerede har - undgår at
    // friste til et dublet-forsøg, som RLS/unique-constraint alligevel
    // ville afvise.
    const availablePrivileges = KNOWN_PRIVILEGES.filter(
        (known) => !privileges.some((existing) => existing.name === known.name),
    )

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

    async function handleCreatePrivilege(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!selectedPrivilege) {
            setPrivilegeValidationError('Vælg et privilegie.')
            return
        }

        const name = selectedPrivilege === CUSTOM_PRIVILEGE_OPTION ? customPrivilegeName.trim() : selectedPrivilege

        if (!name) {
            setPrivilegeValidationError('Privilegiets navn skal udfyldes.')
            return
        }
        setPrivilegeValidationError(null)

        try {
            await createPrivilege({ roleId: role.id, name }).unwrap()
            setSelectedPrivilege('')
            setCustomPrivilegeName('')
        } catch {
            // Fejlen vises via createError.
        }
    }

    const privilegeFormError = privilegeValidationError ?? readableError(createError)

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

            <form onSubmit={handleCreatePrivilege} className="flex flex-wrap items-end gap-2">
                <select
                    value={selectedPrivilege}
                    onChange={(e) => setSelectedPrivilege(e.target.value)}
                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    <option value="" disabled>Vælg privilegie</option>
                    {availablePrivileges.map((p) => (
                        <option key={p.name} value={p.name}>{p.label}</option>
                    ))}
                    <option value={CUSTOM_PRIVILEGE_OPTION}>Andet (indtast selv)...</option>
                </select>
                {selectedPrivilege === CUSTOM_PRIVILEGE_OPTION && (
                    <input
                        type="text"
                        value={customPrivilegeName}
                        onChange={(e) => setCustomPrivilegeName(e.target.value)}
                        placeholder="Fx custom_privilegie"
                        className="flex-1 min-w-[160px] rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                )}
                <button
                    type="submit"
                    disabled={creating}
                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                >
                    {creating ? 'Tilføjer...' : 'Tilføj privilegie'}
                </button>
            </form>

            {privilegeFormError && <p className="text-red-700 text-xs mt-2">{privilegeFormError}</p>}
        </li>
    )
}

interface PrivilegeRowProps {
    privilege: Privilege
    roleName: string
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

interface MembersSectionProps {
    currentUserId: string | null
}

// Organisationens medlemmer, med en dropdown pr. medlem til at tildele
// en rolle. Den indloggede administrators egen række er skrivebeskyttet
// - databasen blokerer selv-tildeling, men UI'en undgår at vise
// kontrollen for ikke at friste til et forsøg, der alligevel fejler.
function MembersSection({ currentUserId }: MembersSectionProps) {
    const { data: members, isLoading: loadingMembers, error: membersError } = useGetOrganisationMembersQuery()
    const { data: roles } = useGetOrganisationRolesQuery()
    const [assignRole, { error: assignError }] = useAssignRoleMutation()
    const [savingUserId, setSavingUserId] = useState<string | null>(null)

    async function handleAssign(member: OrganisationMember, roleId: string) {
        if (!roleId) return
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
                                    value={member.roleId ?? ''}
                                    onChange={(e) => handleAssign(member, e.target.value)}
                                    disabled={savingUserId === member.id}
                                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                                >
                                    <option value="" disabled>Vælg rolle</option>
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
