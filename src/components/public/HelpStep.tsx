// src/components/public/HelpStep.tsx
import type { HelpStepProps } from '../../types/public/publicType'

// Et trin i "Kom godt i gang". Samme kort-geometri som LandingFeatureCard,
// men med trin-tallet i guld ved siden af ikonet - rækkefølgen er pointen,
// så den skal kunne læses uden at tælle kortene.
export function HelpStep({ step, title, description, icon: Icon }: HelpStepProps) {
    return (
        <div className="rounded-lg border border-border-gray bg-white p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-bg-gray flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-secondary" />
                </div>
                <span className="text-sm font-semibold text-accent">Trin {step}</span>
            </div>
            <p className="font-semibold text-primary">{title}</p>
            <p className="text-sm text-secondary mt-2">{description}</p>
        </div>
    )
}
