// src/pages/logIn/ForgotPassword.tsx
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useResetPasswordMutation } from '../../store/apis/authApi'
import { AuthCard } from '../../components/auth/AuthCard'
import { Alert } from '../../components/common/Alert'
import { passwordProblem } from '../../utils/validatePassword'
import { getErrorMessage } from '../../ErrorMessage'

// US-68: den udloggede vej ind igen, når adgangskoden er glemt.
// PROTOTYPE: der sendes ingen bekræftelse på mail - email + fornavn +
// efternavn er hele kontrollen. Se forbeholdet i docs/studerende1-plan.md.
export default function ForgotPassword() {
    const { t } = useTranslation(['auth', 'common'])
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
            return t('forgotPassword.allFieldsRequired')
        }
        const problem = passwordProblem(password, confirmPassword)
        return problem ? t(problem) : null
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
            // RPC'ens fejl er bevidst ens uanset hvilket felt der ikke passede.
            setError(getErrorMessage(err))
        }
    }

    return (
        <AuthCard
            title={t('forgotPassword.title')}
            intro={t('forgotPassword.intro')}
            onSubmit={handleSubmit}
            footer={<>{t('forgotPassword.rememberedIt')} <Link to="/login" className="text-accent hover:underline">{t('login.title')}</Link></>}
        >
            <Alert className="mb-4">{error}</Alert>

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
                <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="password">{t('fields.newPassword')}</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-border-gray dark:border-slate-700 bg-white dark:bg-slate-800 text-primary dark:text-slate-100 px-3 py-2 focus:outline-none focus:border-accent"
                />
            </div>

            <div className="mb-6">
                <label className="block text-sm text-secondary dark:text-slate-400 mb-1" htmlFor="confirmPassword">{t('fields.repeatNewPassword')}</label>
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
                disabled={isLoading}
                className="w-full bg-accent text-accent-text rounded-md py-2 font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
                {isLoading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </button>

            {/* Ærlig note om prototypen - fjernes, når rigtig
                mailbekræftelse kommer på. */}
            <p className="mt-3 text-xs text-secondary dark:text-slate-400 text-center">
                {t('forgotPassword.prototypeNote')}
            </p>
        </AuthCard>
    )
}
