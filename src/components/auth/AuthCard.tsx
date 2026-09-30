// src/components/auth/AuthCard.tsx
import type { AuthCardProps } from '../../types/auth/authType'

// Kortet om login, opret konto og glemt adgangskode.
export function AuthCard({ title, intro, onSubmit, children, footer }: AuthCardProps) {
    return (
        <div className="flex items-center justify-center px-2 py-15 sm:px-6 lg:px-8">
            <form onSubmit={onSubmit} className="bg-white dark:bg-slate-800 border border-border-gray dark:border-slate-700 rounded-lg shadow-md p-5 sm:p-8 max-w-md w-full text-primary dark:text-slate-100">
                <h1 className={`text-xl font-semibold text-primary dark:text-slate-100 ${intro ? 'mb-2' : 'mb-6'}`}>{title}</h1>
                {intro && <p className="text-sm text-secondary dark:text-slate-400 mb-6">{intro}</p>}

                {children}

                <p className="mt-4 text-sm text-secondary dark:text-slate-400 text-center">{footer}</p>
            </form>
        </div>
    )
}
