// src/pages/logIn/ForgotPassword.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useResetPasswordMutation } from '../../store/apis/authApi'

// US-68: den udloggede vej ind igen, når adgangskoden er glemt.
// PROTOTYPE: der sendes ingen bekræftelse på mail - email + fornavn +
// efternavn er hele kontrollen. Se forbeholdet i docs/studerende1-plan.md.
export default function ForgotPassword() {
    const navigate = useNavigate()
    const [resetPassword, { isLoading }] = useResetPasswordMutation()

    // Formfelter: brugerens input
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [error, setError] = useState<string | null>(null)

    // Samme tekster som SignUp.tsx, så de to steder ikke kommer til at
    // sige hver sit om den samme regel.
    function validate(): string | null {
        if (!email.trim() || !firstName.trim() || !lastName.trim()) {
            return 'Udfyld e-mail, fornavn og efternavn.'
        }
        if (password.length < 6) {
            return 'Adgangskoden skal være mindst 6 tegn.'
        }
        if (password !== confirmPassword) {
            return 'Adgangskoderne matcher ikke.'
        }
        return null
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        // Client-side validering først, så vi undgår unødvendige kald
        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        try {
            await resetPassword({ email, firstName, lastName, password }).unwrap()
            // Kvitteringen vises på loginsiden via ?nulstillet=1
            navigate('/login?nulstillet=1', { replace: true })
        } catch (err) {
            // RPC'ens fejlbeskeder er allerede danske og bevidst ens uanset
            // hvilket felt der ikke passede - de vises derfor som de kommer.
            if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
                setError(err.error)
            } else {
                setError('Noget gik galt. Prøv igen.')
            }
        }
    }

    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-2">Nulstil adgangskode</h1>
                <p className="text-sm text-secondary mb-6">
                    Bekræft din konto med e-mail og navn, og vælg en ny adgangskode.
                </p>

                {error && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm text-secondary mb-1" htmlFor="email">E-mail</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-secondary mb-1" htmlFor="firstName">Fornavn</label>
                    <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-secondary mb-1" htmlFor="lastName">Efternavn</label>
                    <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-secondary mb-1" htmlFor="password">Ny adgangskode</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm text-secondary mb-1" htmlFor="confirmPassword">Gentag ny adgangskode</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-white rounded-md py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {isLoading ? 'Nulstiller...' : 'Nulstil adgangskode'}
                </button>

                {/* Ærlig note om prototypen - fjernes, når rigtig
                    mailbekræftelse kommer på. */}
                <p className="mt-3 text-xs text-secondary text-center">
                    Prototype: der sendes ingen bekræftelse på mail.
                </p>

                <p className="mt-4 text-sm text-secondary text-center">
                    Kom du i tanke om den? <Link to="/login" className="text-accent hover:underline">Log ind</Link>
                </p>
            </form>
        </div>
    )
}
