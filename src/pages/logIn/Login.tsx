// src/pages/login/Login.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
    const navigate = useNavigate()

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
            setError('Forkert e-mail eller adgangskode.')
            return
        }

        // Success: send videre til dashboardet.
        navigate('/dashboard')
    }

    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-slate-900">
                <h1 className="text-xl font-semibold text-primary mb-6">Log ind</h1>
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

                <div className="mb-6">
                    <label className="block text-sm text-secondary mb-1" htmlFor="password">Adgangskode</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white rounded-md py-2 font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                >
                    {loading ? 'Logger ind...' : 'Log ind'}
                </button>

                <p className="mt-4 text-sm text-secondary text-center">
                    Har du ikke en konto? <Link to="/signup" className="text-accent hover:underline">Opret konto</Link>
                </p>
            </form>
        </div>
    )
}