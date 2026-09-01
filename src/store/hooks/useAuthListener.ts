import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'   
import { useAppDispatch } from './hooks'        
import { sessionLoaded } from '../slices/authSlice'    

// Denne hook sørger for at Redux-store'ets auth-state altid matcher
// Supabases faktiske login-status - både ved app-opstart og løbende
// (login, logout, token-refresh osv.).
export function useAuthListener() {
    const dispatch = useAppDispatch()

    useEffect(() => {
        // 1) Tjek om der allerede findes en gemt session ved app-opstart
        supabase.auth.getSession().then(({ data }) => {
            dispatch(sessionLoaded(data.session))
        })

        // 2) Lyt til alle fremtidige ændringer i login-status
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            dispatch(sessionLoaded(session))
        })

        // 3) Ryd op når komponenten unmountes
        return () => {
            listener.subscription.unsubscribe()
        }
    }, [dispatch])
}