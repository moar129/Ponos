// src/store/apis/authApi.ts
import type { Session } from '@supabase/supabase-js'
import { supabaseApi, USER_SCOPED_TAGS } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { ChangePasswordInput, ResetPasswordInput } from '../../types/auth/authType'

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

                    // Login/logout betyder brugerens medlemskabsstatus, profil,
                    // privilegier og organisation kan være ændret (fx logget ind
                    // som en anden bruger) - tvinger derfor al bruger-afhængig
                    // data til at hente frisk igen, i stedet for at blive ved med
                    // at vise et forældet resultat fra dengang komponenten først
                    // blev mountet. Uden 'Privilege' her blev fx det admin-kun
                    // "Anmodninger"-link i headeren stående efter logout, indtil
                    // man selv opdaterede siden. Bruger samme tag-liste som
                    // organisationApi.ts's skift-aktiv-org-invalidering
                    // (USER_SCOPED_TAGS) - se dens kommentar for hvorfor.
                    dispatch(supabaseApi.util.invalidateTags([...USER_SCOPED_TAGS]))
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

        // US-68: sætter en ny adgangskode for en UDLOGGET bruger, som har
        // glemt sin. PROTOTYPE uden mailbekræftelse - RPC'en er den eneste
        // kontrol, og den nøjes med email + fornavn + efternavn. Kommer der
        // rigtig mailbekræftelse på senere, er det kun rpc-kaldet herunder
        // der skal skiftes til resetPasswordForEmail/verifyOtp; siden og
        // mutationen kan blive stående.
        // Ingen invalidatesTags: brugeren er ikke logget ind, så der er
        // intet bruger-afhængigt i cachen at opdatere.
        resetPassword: builder.mutation<void, ResetPasswordInput>({
            queryFn: async ({ email, firstName, lastName, password }) => {
                const { error } = await supabase.rpc('reset_password_prototype', {
                    p_email: email.trim(),
                    p_first_name: firstName.trim(),
                    p_last_name: lastName.trim(),
                    p_new_password: password,
                })

                if (error) {
                    // RPC'ens raise exception-beskeder er allerede danske og
                    // bevidst ens uanset hvad der ikke passede, så de kan
                    // vises direkte til brugeren.
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: undefined }
            },
        }),

        // US-69: skifter adgangskoden for en INDLOGGET bruger. Har ikke
        // US-68's prototype-forbehold - identiteten bevises af trin 1.
        changePassword: builder.mutation<void, ChangePasswordInput>({
            queryFn: async ({ currentPassword, newPassword }) => {
                // Emailen tages fra den session, appen allerede har (lokalt
                // opslag, ingen ekstra kald til serveren), så brugeren ikke
                // skal taste sin egen email igen.
                const { data: sessionData } = await supabase.auth.getSession()
                const email = sessionData.session?.user.email

                if (!email) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Du er ikke logget ind.' } }
                }

                // Trin 1 ER verifikationen: Supabase kræver ikke selv den
                // nuværende adgangskode for updateUser, så uden dette trin
                // kunne en efterladt, åben browser bruges til at låse ejeren
                // ude af sin egen konto.
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password: currentPassword,
                })

                if (signInError) {
                    // Intet er ændret på dette tidspunkt.
                    return { error: { status: 'CUSTOM_ERROR', error: 'Din nuværende adgangskode er forkert.' } }
                }

                // Trin 2: selve skiftet. Brugeren forbliver logget ind.
                const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

                if (updateError) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Adgangskoden kunne ikke ændres. Prøv igen.' } }
                }

                return { data: undefined }
            },
        }),
    }),
})

export const {
    useGetSessionQuery,
    useSignOutMutation,
    useResetPasswordMutation,
    useChangePasswordMutation,
} = authApi