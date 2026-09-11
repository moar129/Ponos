import type { LucideIcon } from 'lucide-react'

// Et af forsidens tre hovedområde-kort (Datalager/Opgaver/Statistik).
// Modsat dashboardets QuickLinkCard er kortet IKKE et link - forsidens
// læser er udlogget og har ingen sider at gå til endnu. 'question' er det
// spørgsmål området besvarer ("Hvad har vi?"), som er den korteste måde at
// forklare hvad Ponos gør.
export interface LandingFeatureCardProps {
    label: string
    question: string
    description: string
    icon: LucideIcon
}
