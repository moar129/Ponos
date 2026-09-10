// src/components/dashboard/StatCard.tsx
import type { StatCardProps } from '../../types/dashboard/dashboardType'

// Præsentationskomponent til ét nøgletal på Oversigt-fanen (US-46/47).
export function StatCard({ label, value, isLoading, error, icon: Icon }: StatCardProps) {
    return (
        <div className="flex items-center gap-4 rounded-lg border border-border-gray p-5">
            <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-secondary" />
            </div>
            <div>
                <p className="text-sm text-secondary">{label}</p>
                {error ? (
                    <p className="text-sm text-red-700">{error}</p>
                ) : (
                    <p className="text-2xl font-semibold text-primary">{isLoading ? '…' : value}</p>
                )}
            </div>
        </div>
    )
}
