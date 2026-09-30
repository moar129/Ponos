// src/store/apis/organisationApi.ts
import { supabaseApi, USER_SCOPED_TAGS } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreateOrganisationInput, MyMembership, Organisation, UpdateOrganisationInput } from '../../types/organisation/organisationType'
import { errorCode, mapDbError, QueryFailure, runQuery } from './apiError'
import { getActiveOrganisationId, getActiveOrganisationIdOf, getOptionalUserId } from './session'

type OrgRow = {
    id: string
    name: string
    color: string | null
    header_color?: string | null
    footer_color?: string | null
    header_text_color?: string | null
    footer_text_color?: string | null
    saved_colors?: string[] | null
}

function toOrganisation(row: OrgRow): Organisation {
    return {
        id: row.id,
        name: row.name,
        color: row.color ?? null,
        headerColor: row.header_color ?? null,
        footerColor: row.footer_color ?? null,
        headerTextColor: row.header_text_color ?? null,
        footerTextColor: row.footer_text_color ?? null,
        savedColors: row.saved_colors ?? [],
    }
}

const ORG_COLUMNS = 'id, name, color, header_color, footer_color, header_text_color, footer_text_color, saved_colors'

const MAX_SAVED_COLORS = 12

// Læser den aktive organisations gemte farver, lader change beregne den
// nye liste og skriver den tilbage. Uændret liste = intet skrive-kald.
async function updateSavedColors(change: (current: string[]) => string[]): Promise<{ data: string[] }> {
    const organisationId = await getActiveOrganisationId()

    const { data: org, error: readError } = await supabase
        .from('organisations')
        .select('saved_colors')
        .eq('id', organisationId)
        .maybeSingle()
    if (readError) throw new QueryFailure(mapDbError(readError))

    const current: string[] = org?.saved_colors ?? []
    const next = change(current)
    if (next === current) return { data: current }

    const { error } = await supabase
        .from('organisations')
        .update({ saved_colors: next })
        .eq('id', organisationId)
    if (error) throw new QueryFailure(mapDbError(error))

    return { data: next }
}

export const organisationApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Henter den indloggede brugers egen organisation. Slår først
        // organisation_id op på egen profil (samme mønster som
        // updateMyOrganisation) og henter derefter organisationen med et
        // eksplicit .eq() filter - et ufiltreret select afhænger alene af
        // RLS til at afgrænse til 0/1 række, hvilket i praksis lækker
        // Postgrests PGRST116-fejl igennem i 0-rækker-tilfældet (bruger uden
        // organisation) i stedet for stille at give null.
        getMyOrganisation: builder.query<Organisation | null, void>({
            queryFn: () => runQuery(async () => {
                const userId = await getOptionalUserId()
                if (!userId) return { data: null }

                const organisationId = await getActiveOrganisationIdOf(userId)
                if (!organisationId) return { data: null }

                const { data, error } = await supabase
                    .from('organisations')
                    .select(ORG_COLUMNS)
                    .eq('id', organisationId)
                    .maybeSingle()

                if (error) return { error: mapDbError(error) }
                return { data: data ? toOrganisation(data) : null }
            }),

            providesTags: ['Organisation'],
        }),

        // Søger organisationer på navn (US-05, "Anmod om medlemskab") - brugt
        // af OrganisationPickerComponent. Søgningen sker server-side med en
        // grænse på antal resultater, så klienten aldrig henter hele
        // organisations-tabellen, uanset hvor mange organisationer der er.
        // Genbruger 'Organisation'-tagget, så en nyoprettet organisation
        // (createOrganisation invaliderer det samme tag) dukker op uden reload.
        searchOrganisations: builder.query<Organisation[], string>({
            queryFn: async (searchTerm) => {
                // % og _ er wildcards i ilike - escapes, så de matches bogstaveligt.
                const escaped = searchTerm.replace(/[\\%_]/g, (char) => `\\${char}`)

                const { data, error } = await supabase
                    .from('organisations')
                    .select(ORG_COLUMNS)
                    .ilike('name', `%${escaped}%`)
                    .order('name')
                    .limit(20)

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: (data ?? []).map(toOrganisation) }
            },

            providesTags: ['Organisation'],
        }),

        // Opdaterer organisationens navn og/eller farve. RLS ('Admin kan
        // redigere egen organisation') afviser dette server-side for
        // ikke-admins - profil-opslaget herunder er ikke for adgangskontrol,
        // men for at finde organisationens id (organisations-tabellen peger
        // ikke selv tilbage på brugeren) og for at kunne give en tydelig
        // fejl, hvis brugeren slet ikke er medlem af en organisation.
        // Farven er en fri, valgfri branding-farve (hex, fx '#C7975D') -
        // organisationer skal ikke være låst til Ponos' egne farver, da
        // hjemmesiden skal kunne bruges af alle virksomheder. color: null
        // nulstiller til appens standard-accent.
        updateMyOrganisation: builder.mutation<void, UpdateOrganisationInput>({
            queryFn: ({ name, color, headerColor, footerColor, headerTextColor, footerTextColor }) => runQuery(async () => {
                const organisationId = await getActiveOrganisationId()

                const { error } = await supabase
                    .from('organisations')
                    .update({
                        name,
                        color: color ?? null,
                        header_color: headerColor ?? null,
                        footer_color: footerColor ?? null,
                        header_text_color: headerTextColor ?? null,
                        footer_text_color: footerTextColor ?? null,
                    })
                    .eq('id', organisationId)

                // unique = organisations_name_unique, check =
                // organisations_color_hex_check (ikke en gyldig hex-kode).
                if (error) {
                    return {
                        error: mapDbError(error, {
                            unique: 'duplicateOrganisationName',
                            check: 'invalidOrganisationColor',
                        }),
                    }
                }

                return { data: undefined }
            }),

            // Får getMyOrganisation til at hente frisk data, så det
            // opdaterede navn/farve vises umiddelbart efter en succesfuld
            // gemning.
            invalidatesTags: ['Organisation'],
        }),

        // Opretter en ny organisation og tildeler den kaldende bruger
        // rollen Admin (US-58). Kører server-side som en atomisk
        // 'security definer'-funktion (create_organisation), fordi
        // client-side inserts ikke kan udføre det: roles-tabellens RLS
        // kræver allerede at være admin i orgen, og trg_prevent_self_role_
        // org_change blokerer altid brugerens eget forsøg på at sætte sin
        // egen organisation_id/role_id. Funktionen validerer og fejler
        // atomisk, så organisationen aldrig oprettes delvist. Farven sættes
        // ikke ved oprettelse (null - appens standardfarve), og kan
        // efterfølgende vælges frit via updateMyOrganisation.
        createOrganisation: builder.mutation<Organisation | null, CreateOrganisationInput>({
            queryFn: async ({ name }) => {
                const trimmed = name.trim()

                if (!trimmed) return { error: errorCode('required.organisationName') }

                const { data, error } = await supabase.rpc('create_organisation', { p_name: trimmed })

                if (error) return { error: mapDbError(error, { unique: 'duplicateOrganisationName' }) }
                if (!data) return { error: errorCode('generic') }

                return { data: toOrganisation(data as OrgRow) }
            },

            // Organisation (den nye org), Profile (active_organisation_id
            // ændret), Privilege (brugeren har nu admin-privilegiet) og
            // Membership (nyt medlemskab oprettet) skal alle hentes friske,
            // så resten af UI'en (header, /bruger, dashboardets Organisation-
            // fane) opdaterer sig selv uden reload.
            invalidatesTags: ['Organisation', 'Profile', 'Privilege', 'Membership'],
        }),

        // Henter alle organisationer brugeren er medlem af (US-59), til
        // listen "Mine organisationer" på /organisation. isActive markerer
        // hvilken der p.t. er aktiv organisation. Kører server-side som
        // RPC'en get_my_memberships (security definer) i stedet for
        // separate klient-forespørgsler: roles-tabellens RLS ("Se roller i
        // egen organisation") er scopet til brugerens AKTIVE organisation,
        // så et almindeligt klient-opslag kunne ikke se rollenavnet for en
        // organisation, der ikke lige er aktiv - viste fejlagtigt "Ingen
        // rolle tildelt" for dem. RPC'en omgår det ved at læse alt i én
        // atomisk, uden RLS-begrænsning på selve opslaget.
        getMyMemberships: builder.query<MyMembership[], void>({
            queryFn: async () => {
                const { data, error } = await supabase.rpc('get_my_memberships')

                if (error) {
                    return { error: mapDbError(error) }
                }

                type MyMembershipRow = {
                    organisation_id: string
                    organisation_name: string
                    role_id: string | null
                    role_name: string | null
                    is_active: boolean
                    is_admin: boolean
                    member_count: number
                }

                return {
                    data: ((data ?? []) as MyMembershipRow[]).map((row) => ({
                        organisationId: row.organisation_id,
                        organisationName: row.organisation_name,
                        roleName: row.role_name,
                        isActive: row.is_active,
                        isAdmin: row.is_admin,
                        memberCount: row.member_count,
                    })),
                }
            },

            providesTags: ['Membership'],
        }),

        // Skifter brugerens aktive organisation (US-59). Kører server-side
        // som RPC'en set_active_organisation, som validerer at brugeren
        // faktisk er medlem, før profiles.active_organisation_id ændres -
        // klienten opdaterer aldrig den kolonne direkte.
        setActiveOrganisation: builder.mutation<void, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                const { error } = await supabase.rpc('set_active_organisation', {
                    p_organisation_id: organisationId,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: undefined }
            },

            invalidatesTags: [...USER_SCOPED_TAGS],
        }),

        // Forlader en organisation (US-61). Kører server-side som RPC'en
        // leave_organisation, som blokerer hvis brugeren er organisationens
        // eneste administrator, og - hvis den forladte organisation var
        // aktiv - automatisk vælger en anden af brugerens resterende
        // medlemskaber som ny aktiv organisation (samme "automatisk skift"-
        // mønster som ved oprettelse, US-60). Returnerer den nye aktive
        // organisation (eller null, hvis brugeren ikke har flere
        // medlemskaber tilbage), så UI'en kan vise hvilken organisation
        // brugeren nu er på.
        leaveOrganisation: builder.mutation<Organisation | null, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                const { data, error } = await supabase.rpc('leave_organisation', {
                    p_organisation_id: organisationId,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: data ? toOrganisation(data as OrgRow) : null }
            },

            invalidatesTags: [...USER_SCOPED_TAGS],
        }),

        // Sletter en organisation permanent (US-64). Kører server-side som
        // RPC'en delete_organisation, som kun tillader det for en reel
        // administrator af DEN organisation (ikke nødvendigvis brugerens
        // aktive) - ingen "sidste medlem"-restriktion, dækker både "alene
        // tilbage" og "organisationen lukker ned med andre medlemmer
        // tilbage". Alt underliggende data (opgaver, items, kategorier,
        // lokationer, statistik, roller, medlemskaber) cascader automatisk
        // via eksisterende FK'er. Returnerer den slettende brugers nye
        // aktive organisation (eller null), udfyldt kun hvis den slettede
        // org var brugerens egen aktive - samme mønster som
        // leaveOrganisation.
        deleteOrganisation: builder.mutation<Organisation | null, { organisationId: string }>({
            queryFn: async ({ organisationId }) => {
                const { data, error } = await supabase.rpc('delete_organisation', {
                    p_organisation_id: organisationId,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: data ? toOrganisation(data as OrgRow) : null }
            },

            invalidatesTags: [...USER_SCOPED_TAGS],
        }),

        addSavedOrganisationColor: builder.mutation<string[], { color: string }>({
            queryFn: ({ color }) => runQuery(() =>
                updateSavedColors((current) => {
                    const normalised = color.toUpperCase()
                    return current.includes(normalised) ? current : [...current, normalised].slice(-MAX_SAVED_COLORS)
                }),
            ),
            invalidatesTags: ['Organisation'],
        }),

        removeSavedOrganisationColor: builder.mutation<string[], { color: string }>({
            queryFn: ({ color }) => runQuery(() =>
                updateSavedColors((current) => current.filter((c) => c.toUpperCase() !== color.toUpperCase())),
            ),
            invalidatesTags: ['Organisation'],
        }),
    }),
})

export const {
    useGetMyOrganisationQuery,
    useSearchOrganisationsQuery,
    useUpdateMyOrganisationMutation,
    useCreateOrganisationMutation,
    useGetMyMembershipsQuery,
    useSetActiveOrganisationMutation,
    useLeaveOrganisationMutation,
    useDeleteOrganisationMutation,
    useAddSavedOrganisationColorMutation,
    useRemoveSavedOrganisationColorMutation,
} = organisationApi
// Brugerens medlemskab af den AKTIVE organisation (rolle, admin-flag,
// medlemsantal) - eller null.
export function useActiveMembership(): MyMembership | null {
    const { data: memberships } = useGetMyMembershipsQuery()
    return memberships?.find((membership) => membership.isActive) ?? null
}
