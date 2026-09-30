// src/components/dashboard/DashboardWidget.tsx
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { DashboardWidgetProps, PillTabsProps } from '../../types/dashboard/dashboardWidgetType'

// Kortet om hver widget på Oversigt-fanen: ikon, titel, "Se alle"-link og
// evt. faner til højre.
export function DashboardWidget({ icon, title, link, actions, children }: DashboardWidgetProps) {
    return (
        <div className="rounded-lg border border-border-gray bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="font-medium text-primary dark:text-slate-100">{title}</h3>
                    </div>
                    <Link to={link.to} className="flex items-center gap-1 text-sm text-accent hover:underline shrink-0">
                        {link.label}
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                {actions}
            </div>

            {children}
        </div>
    )
}

// Små pille-faner i en widgets header (fx Alle / Ulæst).
export function PillTabs<K extends string>({ tabs, active, onSelect }: PillTabsProps<K>) {
    return (
        <div className="flex items-center gap-1">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    onClick={() => onSelect(tab.key)}
                    aria-pressed={active === tab.key}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active === tab.key
                        ? 'bg-accent/10 text-accent'
                        : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
