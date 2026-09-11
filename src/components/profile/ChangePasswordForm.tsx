// src/components/profile/ChangePasswordForm.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useChangePasswordMutation } from '../../store/apis/authApi'

// US-69: "Adgangskode"-afsnittet på profilsiden. Egen komponent frem for
// endnu 60 linjer i ProfilePage.tsx. Den nuværende adgangskode bekræftes i
// mutationen - derfor intet prototype-forbehold som på US-68.
export default function ChangePasswordForm() {
    const [changePassword, { isLoading }] = useChangePasswordMutation()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [error, setError] = useState<string | null>(null)
    const [savedMessage, setSavedMessage] = useState(false)

    // Formularen er foldet sammen bag en knap, samme mønster som
    // "Rediger profil" på resten af siden - felterne fylder ikke, før
    // man faktisk vil skifte kode.
    const [isEditing, setIsEditing] = useState(false)

    function clearFields() {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
    }

    function startEdit() {
        clearFields()
        setError(null)
        setSavedMessage(false)
        setIsEditing(true)
    }

    function cancelEdit() {
        clearFields()
        setError(null)
        setIsEditing(false)
    }

    // Samme regler og tekster som SignUp.tsx/ForgotPassword.tsx, plus
    // kravet om at den nye kode faktisk er ny.
    function validate(): string | null {
        if (!currentPassword || !newPassword) {
            return 'Udfyld både din nuværende og din nye adgangskode.'
        }
        if (newPassword.length < 6) {
            return 'Adgangskoden skal være mindst 6 tegn.'
        }
        if (newPassword !== confirmPassword) {
            return 'Adgangskoderne matcher ikke.'
        }
        if (newPassword === currentPassword) {
            return 'Den nye adgangskode skal være forskellig fra den nuværende.'
        }
        return null
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setSavedMessage(false)

        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        try {
            await changePassword({ currentPassword, newPassword }).unwrap()
            // Brugeren er stadig logget ind - formularen foldes bare
            // sammen igen med en kvittering.
            clearFields()
            setIsEditing(false)
            setSavedMessage(true)
        } catch (err) {
            if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
                setError(err.error)
            } else {
                setError('Adgangskoden kunne ikke ændres. Prøv igen.')
            }
        }
    }

    // Sammenfoldet: kvittering (hvis lige skiftet) + knappen der åbner
    // formularen.
    if (!isEditing) {
        return (
            <>
                {savedMessage && (
                    <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                        Din adgangskode er ændret.
                    </div>
                )}

                <button
                    type="button"
                    onClick={startEdit}
                    className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors"
                >
                    Skift adgangskode
                </button>
            </>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm text-secondary mb-1" htmlFor="currentPassword">Nuværende adgangskode</label>
                <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm text-secondary mb-1" htmlFor="newPassword">Ny adgangskode</label>
                <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm text-secondary mb-1" htmlFor="confirmNewPassword">Gentag ny adgangskode</label>
                <input
                    id="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-primary text-white rounded-md px-4 py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {isLoading ? 'Skifter...' : 'Skift adgangskode'}
                </button>
                <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isLoading}
                    className="rounded-md border border-border-gray px-4 py-2 font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                >
                    Annuller
                </button>
            </div>
        </form>
    )
}
