// src/pages/login/SignUp.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase'

export default function SignUp() {
    const navigate = useNavigate()

    // Formfelter: brugerens input
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // UI-status: bruges til at vise fejlbeskeder og loading-tilstand
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Validerer formens input, før vi overhovedet kalder Supabase.
    // Returnerer en fejlbesked (string) hvis noget er ugyldigt,
    // eller null hvis alt er okay.
    // Tjekker: tomme navnefelter, gyldigt email-format,
    // password-længde, og at password/confirmPassword matcher.
    function validate(): string | null {
        if (!firstName.trim() || !lastName.trim()) {
            return 'Fornavn og efternavn skal udfyldes.'
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
            return 'Indtast en gyldig e-mailadresse.'
        }
        if (password.length < 6) {
            return 'Adgangskoden skal være mindst 6 tegn.'
        }
        if (password !== confirmPassword) {
            return 'Adgangskoderne matcher ikke.'
        }
        return null
    }

    // Håndterer formens submit-event. Kalder Supabase Auth for at oprette en ny bruger.
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        // Client-side validering først, så vi undgår unødvendige kald til Supabase
        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        setLoading(true)

        // Opretter brugeren i Supabase Auth. first_name/last_name sendes med i options.
        // data, så de kan læses af handle_new_user()-triggeren i
        // databasen, som opretter den tilhørende profiles-række automatisk.
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                },
            },
        })
        setLoading(false)

        if (signUpError) {
            // Specifik besked hvis emailen allerede er i brug (Supabase's
            // fejltekst tjekkes case-insensitivt), ellers en generisk fejl.
            if (signUpError.message.toLowerCase().includes('already registered')) {
                setError('Der findes allerede en konto med denne e-mail.')
            } else {
                setError('Noget gik galt: ' + signUpError.message)
            }
            return
        }

        // Hvis "Confirm email" er slået til i Supabase, returneres ingen
        // session med det samme - brugeren skal først bekræfte sin email.
        // Vi sender dem til login-siden med en besked om at tjekke deres mail.
        if (!data.session) {
            alert('Tjek din e-mail for at bekræfte din konto, før du kan logge ind.')
            navigate('/login')
            return
        }

        // Hvis der ER en session med det samme (email-bekræftelse er slået fra),
        // sender vi brugeren direkte videre til dashboardet.
        navigate('/dashboard')
    }

    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
                <h1 className="text-xl font-semibold text-primary mb-6">Opret konto</h1>

                {/* Fejlbesked vises kun hvis error er sat */}
                {error && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {error}
                    </div>
                )}

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
                    <label className="block text-sm text-secondary mb-1" htmlFor="password">Adgangskode</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm text-secondary mb-1" htmlFor="confirmPassword">Gentag adgangskode</label>
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
                    disabled={loading}
                    className="w-full bg-primary text-white rounded-md py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {loading ? 'Opretter konto...' : 'Opret konto'}
                </button>

                {/* Link til login-siden - ruten "/login" matcher Login.tsx */}
                <p className="mt-4 text-sm text-secondary text-center">
                    Har du allerede en konto? <Link to="/login" className="text-accent hover:underline">Log ind</Link>
                </p>
            </form>
        </div>
    )
}