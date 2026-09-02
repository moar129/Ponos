// src/routes/ProtectedRoute/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useGetSessionQuery } from '../../store/apis/authApi'

// Beskytter ruter mod uautentificerede brugere.
// Bruges som en "wrapper-route" i App.tsx omkring de sider, der kræver login.
export default function ProtectedRoute() {
    // RTK Query erstatter useAppSelector(state => state.auth...):
    // - data = den aktuelle session (eller null hvis ikke logget ind)
    // - isLoading = true KUN under selve det første fetch (ikke ved efterfølgende
    //   opdateringer fra onAuthStateChange via updateCachedData)
    const { data: session, isLoading } = useGetSessionQuery()

    // Mens vi endnu ikke ved om der findes en session (fx lige ved
    // app-opstart), viser vi en simpel loading-tilstand i stedet for
    // at antage brugeren ikke er logget ind.
    if (isLoading) {
        return <div>Indlæser...</div>
    }

    // Ingen session fundet -> send brugeren til login.
    // "replace" betyder den beskyttede side ikke havner i browser-
    // historikken, så "tilbage"-knappen ikke sender folk i en loop.
    if (!session) {
        return <Navigate to="/login" replace />
    }

    // Bruger er logget ind -> render den faktiske side (barne-route).
    // <Outlet /> er react-router's måde at sige "indsæt den matchende child-route her"
    return <Outlet />
}