// src/components/dashboard/QuickLinkCard.tsx
import { Link } from 'react-router-dom'
import type { QuickLinkCardProps } from '../../types/dashboard/dashboardType'

// Klikbar genvej til en anden side i appen, vist på Oversigt-fanen.
// Samme visuelle sprog som PlaceholderBar, men er en Link i stedet for tekst.
export function QuickLinkCard({ to, label, description, icon: Icon }: QuickLinkCardProps) {
    return (
        <Link
            to={to}
            className="flex items-center gap-4 rounded-lg border border-border-gray bg-white p-5 hover:border-accent hover:bg-bg-gray/40 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/40"
        >
            <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center shrink-0 dark:bg-slate-800">
                <Icon className="w-6 h-6 text-secondary dark:text-slate-400" />
            </div>
            <div>
                <p className="font-medium text-primary dark:text-slate-100">{label}</p>
                <p className="text-sm text-secondary dark:text-slate-400">{description}</p>
            </div>
        </Link>
    )
}
