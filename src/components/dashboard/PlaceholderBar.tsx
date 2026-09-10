// src/components/dashboard/PlaceholderBar.tsx
import type { PlaceholderBarProps } from '../../types/dashboard/dashboardType'

// Fuld-bredde "kommer snart"-bjælke til Oversigt-fanen, brugt til
// funktioner uden data/backend endnu (Dine opgaver, Notifikationer,
// Nyheder) - rent visuelt, ingen queries.
export function PlaceholderBar({ label, description, icon: Icon }: PlaceholderBarProps) {
    return (
        <div className="flex items-center gap-4 rounded-lg border border-dashed border-border-gray bg-bg-gray/40 p-5">
            <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-secondary" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-medium text-primary">{label}</p>
                    <span className="text-xs font-medium text-secondary bg-bg-gray rounded-full px-2 py-0.5">
                        Kommer snart
                    </span>
                </div>
                <p className="text-sm text-secondary">{description}</p>
            </div>
        </div>
    )
}
