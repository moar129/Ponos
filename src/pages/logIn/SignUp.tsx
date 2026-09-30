// src/pages/login/SignUp.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { AuthCard } from '../../components/auth/AuthCard'
import { Alert } from '../../components/common/Alert'
import { passwordProblem } from '../../utils/validatePassword'

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
        const problem = passwordProblem(password, confirmPassword)
        return problem ? t(problem) : null
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
        <AuthCard
            title={t('signup.title')}
            onSubmit={handleSubmit}
            footer={<>{t('signup.haveAccount')} <Link to="/login" className="text-accent hover:underline">{t('signup.loginLink')}</Link></>}
        >
            <Alert className="mb-4">{error}</Alert>

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
                className="w-full bg-accent text-accent-text rounded-md py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
                {loading ? t('signup.submitting') : t('signup.submit')}
            </button>
        </AuthCard>
    )
}