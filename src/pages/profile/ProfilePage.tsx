// src/pages/profile/ProfilePage.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useGetMyProfileQuery, useUpdateMyProfileMutation } from '../../store/apis/profileApi'
import { useSignOutMutation } from '../../store/apis/authApi'
import ChangePasswordForm from '../../components/profile/ChangePasswordForm'
import type { Profile, UpdateProfileInput } from '../../types/profile/profileType'

// Tom formular-tilstand, indtil brugeren trykker "Rediger profil" og
// felterne fyldes med profilens nuværende værdier.
const emptyForm: UpdateProfileInput = {
    firstName: '',
    lastName: '',
    description: null,
    urlPicture: null,
}

// se profil og rediger profil. Siden viser brugerens egne
// oplysninger og kan skifte til en redigerings-tilstand for de felter,
// brugeren selv må ændre. Rolle, organisation og e-mail vises kun.
export default function ProfilePage() {
    const navigate = useNavigate()
    const { data: profile, isLoading, error: queryError } = useGetMyProfileQuery()
    const [updateMyProfile, { isLoading: saving, error: mutationError }] = useUpdateMyProfileMutation()
    const [signOut, { isLoading: signingOut }] = useSignOutMutation()

    const [isEditing, setIsEditing] = useState(false)
    const [form, setForm] = useState<UpdateProfileInput>(emptyForm)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)

    function startEdit(current: Profile) {
        setForm({
            firstName: current.firstName,
            lastName: current.lastName,
            description: current.description,
            urlPicture: current.urlPicture,
        })
        setValidationError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setValidationError(null)
    }

    async function handleSignOut() {
        await signOut()
        // Auth-listeneren i authApi rydder selv cachen; her sikrer vi bare
        // at brugeren ikke bliver stående på den beskyttede profilside.
        navigate('/login')
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavedMessage(false)

        if (!form.firstName.trim() || !form.lastName.trim()) {
            setValidationError('Fornavn og efternavn skal udfyldes.')
            return
        }
        setValidationError(null)

        try {
            // Tomme tekstfelter gemmes som null i stedet for "", så
            // databasen ikke ender med tomme strenge for valgfri felter.
            await updateMyProfile({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                description: form.description?.trim() || null,
                urlPicture: form.urlPicture?.trim() || null,
            }).unwrap()

            // Mutationen invaliderer 'Profile', så visningen nedenfor
            // henter og viser de nye oplysninger automatisk.
            setIsEditing(false)
            setSavedMessage(true)
        } catch {
            // Fejlen vises via mutationError - vi bliver i redigerings-
            // tilstand, så brugerens indtastninger ikke går tabt.
        }
    }

    // Udtrækker en læsbar fejlbesked fra RTK Query's error-objekt, som kan
    // komme i lidt forskellige former afhængigt af hvor fejlen opstod.
    function readableError(err: unknown): string | null {
        if (!err) return null
        if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
            return err.error
        }
        return 'Noget gik galt. Prøv igen.'
    }

    if (isLoading) {
        return <p className="text-secondary">Indlæser profil...</p>
    }

    if (queryError) {
        return (
            <div className="max-w-2xl mx-auto rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {readableError(queryError)}
            </div>
        )
    }

    if (!profile) {
        return <p className="text-secondary">Din profil kunne ikke findes.</p>
    }

    const saveError = readableError(mutationError)

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-slate-900">
            {/* Overskrift med profilbillede/ikon og navn */}
            <div className="flex items-center gap-4 mb-6">
                {profile.urlPicture ? (
                    <img
                        src={profile.urlPicture}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover border border-border-gray"
                    />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-bg-gray flex items-center justify-center">
                        <User className="w-8 h-8 text-secondary" />
                    </div>
                )}
                <div>
                    <h1 className="text-xl font-semibold text-primary">
                        {profile.firstName} {profile.lastName}
                    </h1>
                    <p className="text-sm text-secondary">{profile.email}</p>
                </div>
            </div>

            {savedMessage && !isEditing && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    Dine oplysninger er gemt.
                </div>
            )}

            {(validationError || saveError) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {validationError ?? saveError}
                </div>
            )}

            {isEditing ? (
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm text-secondary mb-1" htmlFor="firstName">Fornavn</label>
                        <input
                            id="firstName"
                            type="text"
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-secondary mb-1" htmlFor="lastName">Efternavn</label>
                        <input
                            id="lastName"
                            type="text"
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-secondary mb-1" htmlFor="description">Beskrivelse</label>
                        <textarea
                            id="description"
                            rows={3}
                            value={form.description ?? ''}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm text-secondary mb-1" htmlFor="urlPicture">Profilbillede (URL)</label>
                        <input
                            id="urlPicture"
                            type="url"
                            value={form.urlPicture ?? ''}
                            onChange={(e) => setForm({ ...form, urlPicture: e.target.value })}
                            className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>

                    {/* E-mail, rolle og organisation kan ikke redigeres her:
                        e-mail hører til Supabase Auth, og rolle/organisation
                        blokeres server-side. */}
                    <p className="mb-6 text-xs text-secondary">
                        E-mail, rolle og organisation kan ikke ændres her. Kontakt din administrator.
                    </p>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                        >
                            {saving ? 'Gemmer...' : 'Gem ændringer'}
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md border border-border-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                        >
                            Annuller
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <dl className="divide-y divide-border-gray border-t border-border-gray">
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Fornavn</dt>
                            <dd className="text-sm text-right">{profile.firstName}</dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Efternavn</dt>
                            <dd className="text-sm text-right">{profile.lastName}</dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">E-mail</dt>
                            <dd className="text-sm text-right">{profile.email}</dd>
                        </div>
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Organisation</dt>
                            <dd className="text-sm text-right">
                                {profile.organisationName ?? 'Ingen organisation'}
                            </dd>
                        </div>
                        {/* Rolle vises kun, hvis brugeren har en aktiv organisation */}
                        {profile.activeOrganisationId && (
                            <div className="py-3 flex justify-between gap-4">
                                <dt className="text-sm text-secondary">Rolle</dt>
                                <dd className="text-sm text-right">
                                    {profile.roleName ?? 'Ingen rolle tildelt'}
                                </dd>
                            </div>
                        )}
                        <div className="py-3 flex justify-between gap-4">
                            <dt className="text-sm text-secondary">Beskrivelse</dt>
                            <dd className="text-sm text-right">
                                {profile.description ?? 'Ingen beskrivelse'}
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => startEdit(profile)}
                            className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors"
                        >
                            Rediger profil
                        </button>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="flex items-center gap-2 rounded-md border border-border-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                        >
                            <LogOut className="w-4 h-4" />
                            {signingOut ? 'Logger ud...' : 'Log ud'}
                        </button>
                    </div>
                </>
            )}

            {/* US-69: eget afsnit nederst. Skjules under redigering, så
                der ikke står to formularer oven på hinanden. */}
            {!isEditing && (
                <section className="mt-8 pt-6 border-t border-border-gray">
                    <h2 className="text-lg font-semibold text-primary mb-4">Adgangskode</h2>
                    <ChangePasswordForm />
                </section>
            )}
        </div>
    )
}
