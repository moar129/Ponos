// src/pages/roles/RolesPage.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import {
    useAssignRoleMutation,
    useCreateRoleMutation,
    useGetOrganisationMembersQuery,
    useGetOrganisationRolesQuery,
} from '../../store/apis/roleApi'
import { useCreatePrivilegeMutation, useGetOrganisationPrivilegesQuery, useIsAdmin } from '../../store/apis/privilegeApi'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import type { OrganisationMember, Role } from '../../types/role/roleType'

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
// admin-side: opret roller, tilknyt privileges til dem, og tildel
// roller til organisationens medlemmer. Adgangen håndhæves server-side
// af RLS - tjekket her er kun for at undgå at vise siden til brugere
// uden rettigheder.
export default function RolesPage() {
    const { isAdmin, isLoading: loadingPrivileges } = useIsAdmin()
    const { data: myProfile } = useGetMyProfileQuery()

    if (loadingPrivileges) {
        return <p className="text-secondary">Indlæser...</p>
    }

    if (!isAdmin) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-2">Ingen adgang</h1>
                <p className="text-sm text-secondary">
                    Kun administratorer kan administrere roller og privileges.
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-lg shadow-md p-8 text-slate-900">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-primary">Roller & privileges</h1>
                        <p className="text-sm text-secondary">
                            Opret roller, tilknyt privileges, og tildel roller til organisationens medlemmer.
                        </p>
                    </div>
                </div>

                <RolesSection />
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 text-slate-900">
                <h2 className="text-lg font-semibold text-primary mb-4">Medlemmer</h2>
                <MembersSection currentUserId={myProfile?.id ?? null} />
            </div>
        </div>
    )
}

// Roller med deres privileges, plus formularer til at oprette en ny
// rolle og tilknytte et nyt privilege til en rolle.
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
                            privilegeNames={(privileges ?? []).filter((p) => p.roleId === role.id).map((p) => p.name)}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

interface RoleCardProps {
    role: Role
    privilegeNames: string[]
}

// Én rolle: dens tilknyttede privileges, plus en lille formular til at
// tilføje endnu et privilege til netop denne rolle.
function RoleCard({ role, privilegeNames }: RoleCardProps) {
    const [createPrivilege, { isLoading: creating, error: createError }] = useCreatePrivilegeMutation()
    const [newPrivilegeName, setNewPrivilegeName] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)

    async function handleCreatePrivilege(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (!newPrivilegeName.trim()) {
            setValidationError('Privilegiets navn skal udfyldes.')
            return
        }
        setValidationError(null)

        try {
            await createPrivilege({ roleId: role.id, name: newPrivilegeName }).unwrap()
            setNewPrivilegeName('')
        } catch {
            // Fejlen vises via createError.
        }
    }

    const error = validationError ?? readableError(createError)

    return (
        <li className="border border-border-gray rounded-md p-4">
            <p className="font-medium mb-2">{role.name}</p>

            {privilegeNames.length === 0 ? (
                <p className="text-sm text-secondary mb-3">Ingen privileges endnu.</p>
            ) : (
                <ul className="flex flex-wrap gap-2 mb-3">
                    {privilegeNames.map((name) => (
                        <li
                            key={name}
                            className="text-xs bg-bg-gray text-secondary rounded-full px-3 py-1"
                        >
                            {name}
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={handleCreatePrivilege} className="flex flex-wrap items-end gap-2">
                <input
                    type="text"
                    value={newPrivilegeName}
                    onChange={(e) => setNewPrivilegeName(e.target.value)}
                    placeholder="Nyt privilege, fx admin"
                    className="flex-1 min-w-[160px] rounded-md border border-border-gray px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                    type="submit"
                    disabled={creating}
                    className="rounded-md border border-border-gray px-3 py-1.5 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                >
                    {creating ? 'Tilføjer...' : 'Tilføj privilege'}
                </button>
            </form>

            {error && <p className="text-red-700 text-xs mt-2">{error}</p>}
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
