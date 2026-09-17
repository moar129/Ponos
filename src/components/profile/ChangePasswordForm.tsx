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
                    <div className="mb-4 rounded-md bg-green-50 dark:bg-emerald-900/30 border border-green-200 dark:border-emerald-800 text-green-700 dark:text-emerald-400 text-sm px-3 py-2">
                        Din adgangskode er ændret.
                    </div>
                )}

                <button
                    type="button"
                    onClick={startEdit}
                    className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors"
                >
                    Skift adgangskode
                </button>
            </>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="currentPassword">Nuværende adgangskode</label>
                <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                />
            </div>

            <div className="mb-4">
                <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="newPassword">Ny adgangskode</label>
                <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="confirmNewPassword">Gentag ny adgangskode</label>
                <input
                    id="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-accent text-white rounded-md px-4 py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {isLoading ? 'Skifter...' : 'Skift adgangskode'}
                </button>
                <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isLoading}
                    className="rounded-md border border-border-gray dark:border-slate-700 px-4 py-2 font-medium text-secondary dark:text-slate-400 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                >
                    Annuller
                </button>
            </div>
        </form>
    )
}
