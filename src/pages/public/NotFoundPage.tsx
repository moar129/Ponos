// src/pages/public/NotFoundPage.tsx
import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGetSessionQuery } from '../../store/apis/authApi'

// Catch-all for ukendte URL'er (<Route path="*"> i App.tsx). Før denne
// side stod der bare en tom side mellem header og footer, hvis man skrev
// forkert eller fulgte et forældet link.
//
// Ligger bevidst i <main>'ens almindelige max-w-7xl-wrapper og ikke i
// FULL_WIDTH_ROUTES: en fejlside skal ikke ligne en marketingside.
export default function NotFoundPage() {
    // Samme session-kilde som resten af appen. Bestemmer kun hvor "tilbage"
    // peger hen - siden vises ens for alle.
    const { data: session } = useGetSessionQuery()

    return (
        <div className="max-w-xl mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full bg-bg-gray flex items-center justify-center mx-auto">
                <Compass className="w-8 h-8 text-secondary" />
            </div>

            <h1 className="mt-6 text-2xl sm:text-3xl font-semibold text-primary">
                Siden findes ikke
            </h1>

            <p className="mt-4 text-secondary">
                Der er ikke noget på den adresse. Enten er der smuttet et bogstav undervejs, eller
                også er siden flyttet, siden linket blev lavet.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                    to={session ? '/dashboard' : '/'}
                    className="inline-flex items-center justify-center bg-accent text-primary rounded-md px-6 py-3 font-semibold hover:bg-accent-hover transition-colors"
                >
                    {session ? 'Gå til dashboardet' : 'Gå til forsiden'}
                </Link>
                <Link
                    to="/hjaelp"
                    className="inline-flex items-center justify-center rounded-md border border-border-gray px-6 py-3 font-medium text-primary hover:bg-bg-gray/40 transition-colors"
                >
                    Hjælp &amp; support
                </Link>
            </div>
        </div>
    )
}
