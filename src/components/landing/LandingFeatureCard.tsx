// src/components/landing/LandingFeatureCard.tsx
import type { LandingFeatureCardProps } from '../../types/landing/landingType'

// Samme visuelle sprog som dashboardets QuickLinkCard, men stablet i stedet
// for vandret (kortene står side om side i et 3-kolonne grid, ikke i en
// liste) og uden Link-wrapper - se LandingFeatureCardProps.
export function LandingFeatureCard({ label, question, description, icon: Icon }: LandingFeatureCardProps) {
    return (
        <div className="rounded-lg border border-border-gray bg-white p-5">
            <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center shrink-0 mb-4">
                <Icon className="w-6 h-6 text-secondary" />
            </div>
            <p className="font-semibold text-primary">{label}</p>
            <p className="text-sm font-medium text-accent mt-0.5">{question}</p>
            <p className="text-sm text-secondary mt-2">{description}</p>
        </div>
    )
}
