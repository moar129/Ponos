// src/components/landing/LandingAuthButtons.tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// "Opret konto" + "Log ind" - øverst og nederst på forsiden.
export function LandingAuthButtons({ className = '' }: { className?: string }) {
    const { t } = useTranslation('public')

    return (
        <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
            <Link
                to="/signup"
                className="inline-flex items-center justify-center bg-accent text-accent-text rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
            >
                {t('cta.signup')}
            </Link>
            <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-slate-600 px-6 py-3 font-medium text-slate-200 hover:bg-slate-800/50 hover:text-white transition-colors"
            >
                {t('cta.login')}
            </Link>
        </div>
    )
}
