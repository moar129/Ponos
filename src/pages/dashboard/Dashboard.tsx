import { useAppSelector } from '../../store/hooks/hooks'
import { supabase } from '../../lib/supabase'

// Midlertidig placeholder-dashboard, indtil US-45 bygges rigtigt.
// Bruges lige nu kun til at bekræfte at login/ProtectedRoute virker.
export default function Dashboard() {
    // Henter session fra Redux - opdateres automatisk af useAuthListener
    const session = useAppSelector((state) => state.auth.session)

    async function handleLogout() {
        await supabase.auth.signOut()
        // Ingen navigate() nødvendig: onAuthStateChange fanger logout,
        // opdaterer Redux til 'unauthenticated', og ProtectedRoute
        // sender dig automatisk til /login.
    }

    return (
        <div>
            <h1 className="text-xl font-semibold text-primary">Dashboard (midlertidig)</h1>
            <p className="mt-2 text-secondary">
                Du er logget ind som: <strong>{session?.user.email}</strong>
            </p>
            <button
                onClick={handleLogout}
                className="mt-4 bg-primary text-white rounded-md px-4 py-2"
            >
                Log ud
            </button>
        </div>
    )
}