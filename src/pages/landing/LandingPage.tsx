// src/pages/landing/LandingPage.tsx
import { Navigate } from 'react-router-dom'
import { useGetSessionQuery } from '../../store/apis/authApi'
import { LandingHero } from '../../components/landing/LandingHero'
import { LandingProblem } from '../../components/landing/LandingProblem'
import { LandingFeatures } from '../../components/landing/LandingFeatures'
import { LandingFlow } from '../../components/landing/LandingFlow'
import { LandingPartner } from '../../components/landing/LandingPartner'
import { LandingCta } from '../../components/landing/LandingCta'

// Offentlig forside på "/". Modsat resten af appen ligger den UDEN for
// <main>'ens max-w-7xl-wrapper (se App.tsx), så hver sektion selv kan gå
// kant-til-kant og holde sit indhold på plads med en egen max-w-7xl.
export default function LandingPage() {
    // Forsiden er for udloggede - en indlogget bruger hører hjemme på
    // dashboardet. Samme session-kilde som ProtectedRoute.
    const { data: session, isLoading } = useGetSessionQuery()

    // Vent på svaret i stedet for at antage "ikke logget ind", så forsiden
    // ikke blinker forbi for en bruger der er på vej til dashboardet.
    if (isLoading) {
        return null
    }

    if (session) {
        return <Navigate to="/dashboard" replace />
    }

    return (
        <>
            <LandingHero />
            <LandingProblem />
            <LandingFeatures />
            <LandingFlow />
            <LandingPartner />
            <LandingCta />
        </>
    )
}
