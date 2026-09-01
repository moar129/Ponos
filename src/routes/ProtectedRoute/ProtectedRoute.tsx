import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../../store/hooks/hooks'

// Beskytter ruter mod uautentificerede brugere.
// Bruges som en "wrapper-route" i App.tsx omkring de sider, der kræver login.
export default function ProtectedRoute() {
    // Læser auth-status direkte fra Redux-store'et (opdateres automatisk
    // af useAuthListener ved login/logout/app-opstart)
    const status = useAppSelector((state) => state.auth.status)

    // Mens vi endnu ikke ved om der findes en session (fx lige ved
    // app-opstart), viser vi en simpel loading-tilstand i stedet for
    // at antage brugeren ikke er logget ind.
    if (status === 'loading') {
        return <div>Indlæser...</div>
    }

    // Ingen session fundet -> send brugeren til login.
    // "replace" betyder den beskyttede side ikke havner i browser-
    // historikken, så "tilbage"-knappen ikke sender folk i en loop.
    if (status === 'unauthenticated') {
        return <Navigate to="/login" replace />
    }

    // Bruger er logget ind -> render den faktiske side (barne-route).
    // <Outlet /> er react-router's måde at sige "indsæt den matchende child-route her" 
    return <Outlet />
}