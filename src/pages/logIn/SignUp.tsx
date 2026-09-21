// src/pages/login/SignUp.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

export default function SignUp() {
    const { t } = useTranslation('auth')
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
            return t('signup.nameRequired')
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
            return t('signup.invalidEmail')
        }
        if (password.length < 6) {
            return t('validation.passwordTooShort')
        }
        if (password !== confirmPassword) {
            return t('validation.passwordsDoNotMatch')
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
                setError(t('signup.emailTaken'))
            } else {
                setError(t('signup.genericError', { message: signUpError.message }))
            }
            return
        }

        // Hvis "Confirm email" er slået til i Supabase, returneres ingen
        // session med det samme - brugeren skal først bekræfte sin email.
        // Vi sender dem til login-siden med en besked om at tjekke deres mail.
        if (!data.session) {
            alert(t('signup.confirmEmail'))
            navigate('/login')
            return
        }

        // Hvis der ER en session med det samme (email-bekræftelse er slået fra),
        // sender vi brugeren direkte videre til dashboardet.
        navigate('/dashboard')
    }

    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-border-gray dark:border-slate-700 rounded-lg shadow-md p-8 max-w-md w-full text-primary dark:text-slate-100">
                <h1 className="text-xl font-semibold text-primary dark:text-slate-100 mb-6">{t('signup.title')}</h1>

                {/* Fejlbesked vises kun hvis error er sat */}
                {error && (
                    <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="firstName">{t('fields.firstName')}</label>
                    <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="lastName">{t('fields.lastName')}</label>
                    <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="email">{t('fields.email')}</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="password">{t('fields.password')}</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="confirmPassword">{t('fields.repeatPassword')}</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-white rounded-md py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {loading ? t('signup.submitting') : t('signup.submit')}
                </button>

                {/* Link til login-siden - ruten "/login" matcher Login.tsx */}
                <p className="mt-4 text-sm text-secondary dark:text-slate-400 text-center">
                    {t('signup.haveAccount')} <Link to="/login" className="text-accent hover:underline">{t('signup.loginLink')}</Link>
                </p>
            </form>
        </div>
    )
}