// src/store/apis/authApi.ts
import type { Session } from '@supabase/supabase-js'
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'

export const authApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getSession: builder.query<Session | null, void>({
            // Engangs-fetch: hentes når queryen først bruges (fx ved app-opstart)
            queryFn: async () => {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: data.session }
            },

            providesTags: ['Session'],

            // Løbende abonnement: holder cachen opdateret ved login/logout/token-refresh,
            // uden at nogen komponent selv skal spørge igen
            async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }) {
                // Vent til det første queryFn-kald ovenfor er færdigt, så vi ikke
                // abonnerer, før der overhovedet er noget i cachen at opdatere
                await cacheDataLoaded

                const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
                    // Skriver direkte ind i RTK Query's cache - alle komponenter der
                    // bruger useGetSessionQuery() re-rendrer automatisk med den nye session
                    updateCachedData(() => session)

                    // Login/logout betyder brugerens medlemskabsstatus og profil
                    // kan være ændret (fx logget ind som en anden bruger) - tvinger
                    // derfor getMyPendingRequest og getMyProfile til at hente frisk
                    // data igen, i stedet for at blive ved med at vise et forældet
                    // resultat fra dengang komponenten først blev mountet. Uden
                    // 'Profile' her ville headeren først vise det rigtige navn efter
                    // et sideskift eller en refresh.
                    dispatch(supabaseApi.util.invalidateTags(['PendingRequest', 'Profile']))
                })

                // Når ingen komponenter længere abonnerer på denne query (fx ved
                // hot-reload eller hvis alle forbrugere unmountes), rydder vi op
                await cacheEntryRemoved
                listener.subscription.unsubscribe()
            },
        }),

        // Logger brugeren ud. Selve cache-oprydningen sker automatisk:
        // signOut udløser onAuthStateChange ovenfor, som både nulstiller
        // session-cachen og invaliderer profil/medlemskabsdata.
        signOut: builder.mutation<void, void>({
            queryFn: async () => {
                const { error } = await supabase.auth.signOut()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },
        }),
    }),
})

export const { useGetSessionQuery, useSignOutMutation } = authApi