// src/pages/login/Login.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

export default function Login() {
    const navigate = useNavigate()
    const { t } = useTranslation('auth')

    // US-68: ForgotPassword sender hertil med ?nulstillet=1 efter et
    // gennemført skift, så kvitteringen står, hvor man skal bruge den.
    const [searchParams] = useSearchParams()
    const passwordWasReset = searchParams.get('nulstillet') === '1'

    // Formfelter: brugerens input
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // UI-status: error + loading
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        // Kalder Supabase Auth med email + password.
        // signInWithPassword returnerer enten en session (success) eller en error.
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        })
        setLoading(false)

        if (signInError) {
            //viser en fejlmeddelelse ved forkert email/password.
            setError(t('login.wrongCredentials'))
            return
        }

        // Success: send videre til dashboardet.
        navigate('/dashboard')
    }

    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-border-gray dark:border-slate-700 rounded-lg shadow-md p-8 max-w-md w-full text-primary dark:text-slate-100">
                <h1 className="text-xl font-semibold text-primary dark:text-slate-100 mb-6">{t('login.title')}</h1>

                {passwordWasReset && (
                    <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2">
                        {t('login.passwordWasReset')}
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                        {error}
                    </div>
                )}

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

                <div className="mb-6">
                    <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="password">{t('fields.password')}</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                    />
                    <p className="mt-2 text-sm">
                        <Link to="/glemt-adgangskode" className="text-accent hover:underline">{t('login.forgotPassword')}</Link>
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-white rounded-md py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
                >
                    {loading ? t('login.submitting') : t('login.submit')}
                </button>

                <p className="mt-4 text-sm text-secondary dark:text-slate-400 text-center">
                    {t('login.noAccount')} <Link to="/signup" className="text-accent hover:underline">{t('signup.title')}</Link>
                </p>
            </form>
        </div>
    )
}