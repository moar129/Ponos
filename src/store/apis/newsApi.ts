// src/store/apis/newsApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type {
    CreateNewsInput,
    News,
    NewsSource,
    UpdateNewsInput,
    UpsertNewsSourceInput,
} from '../../types/news/newsType'

async function getAuthenticatedOrganisationId(): Promise<string> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
        throw new Error('Du skal være logget ind for at udføre denne handling.')
    }

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_organisation_id')
        .eq('id', authData.user.id)
        .single()

    if (profileError || !profileData?.active_organisation_id) {
        throw new Error('Kunne ikke hente din organisationstilknytning.')
    }

    return profileData.active_organisation_id
}

// 42501 = RLS afviste - bruger uden manage_news-privilegiet forsøgte at
// oprette/redigere/slette. Samme mønster som privilegeApi.ts/roleApi.ts.
function mapNewsError(error: { code?: string; message: string }, action: string): { status: 'CUSTOM_ERROR'; error: string } {
    if (error.code === '42501') {
        return { status: 'CUSTOM_ERROR', error: `Du har ikke rettigheder til at ${action}.` }
    }
    return { status: 'CUSTOM_ERROR', error: error.message }
}

function mapNewsRow(row: {
    id: string
    organisation_id: string
    title: string
    description: string | null
    picture_url: string | null
    published_at: string
    url: string | null
    source: string
    external_ref: string | null
}): News {
    return {
        id: row.id,
        organisationId: row.organisation_id,
        title: row.title,
        description: row.description,
        pictureUrl: row.picture_url,
        publishedAt: row.published_at,
        url: row.url,
        source: row.source === 'api' ? 'api' : 'manual',
        externalRef: row.external_ref,
    }
}

// Forventet, generisk kontrakt for en organisations eksterne nyheds-API
// (US-57). Ingen konkret API er valgt endnu, så feltmapping er bevidst
// fast frem for konfigurerbar - kan udvides senere.
interface ExternalNewsItem {
    title: string
    description?: string | null
    imageUrl?: string | null
    publishedAt?: string | null
    url?: string | null
    id?: string | number
}

function deriveExternalRef(item: ExternalNewsItem): string {
    if (item.id !== undefined && item.id !== null) return String(item.id)
    return `${item.title}-${item.publishedAt ?? ''}`
}

export const newsApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getNews: builder.query<News[], void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('news')
                        .select('id, organisation_id, title, description, picture_url, published_at, url, source, external_ref')
                        .eq('organisation_id', organisationId)
                        .order('published_at', { ascending: false })

                    if (error) {
                        return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                    }

                    return { data: (data ?? []).map(mapNewsRow) }
                } catch (err: any) {
                    return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved hentning af nyheder' } }
                }
            },
            providesTags: (result) =>
                result
                    ? [{ type: 'News' as const, id: 'LIST' }, ...result.map((n) => ({ type: 'News' as const, id: n.id }))]
                    : [{ type: 'News' as const, id: 'LIST' }],
        }),

        // Én nyhed, til detalje-siden (/nyheder/:id) - egen query frem for
        // kun at slå op i getNews-cachen, så et direkte link/genindlæsning
        // af siden virker uden at have besøgt listen først.
        getNewsById: builder.query<News, string>({
            queryFn: async (id) => {
                const { data, error } = await supabase
                    .from('news')
                    .select('id, organisation_id, title, description, picture_url, published_at, url, source, external_ref')
                    .eq('id', id)
                    .single()

                if (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                }

                return { data: mapNewsRow(data) }
            },
            providesTags: (_result, _error, id) => [{ type: 'News', id }],
        }),

        createNews: builder.mutation<News, CreateNewsInput>({
            queryFn: async (input) => {
                try {
                    const trimmedTitle = input.title.trim()
                    if (!trimmedTitle) {
                        return { error: { status: 'CUSTOM_ERROR', error: 'Nyhedens titel skal udfyldes.' } }
                    }

                    const organisationId = await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('news')
                        .insert({
                            organisation_id: organisationId,
                            title: trimmedTitle,
                            description: input.description ?? null,
                            picture_url: input.pictureUrl ?? null,
                            url: input.url ?? null,
                            ...(input.publishedAt ? { published_at: input.publishedAt } : {}),
                            source: 'manual',
                        })
                        .select('id, organisation_id, title, description, picture_url, published_at, url, source, external_ref')
                        .single()

                    if (error) {
                        return { error: mapNewsError(error, 'oprette denne nyhed') }
                    }

                    return { data: mapNewsRow(data) }
                } catch (err: any) {
                    return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved oprettelse af nyhed' } }
                }
            },
            invalidatesTags: [{ type: 'News', id: 'LIST' }],
        }),

        updateNews: builder.mutation<void, UpdateNewsInput>({
            queryFn: async ({ id, ...changes }) => {
                if (changes.title !== undefined && !changes.title.trim()) {
                    return { error: { status: 'CUSTOM_ERROR', error: 'Nyhedens titel skal udfyldes.' } }
                }

                const { error } = await supabase
                    .from('news')
                    .update({
                        ...(changes.title !== undefined && { title: changes.title.trim() }),
                        ...(changes.description !== undefined && { description: changes.description }),
                        ...(changes.pictureUrl !== undefined && { picture_url: changes.pictureUrl }),
                        ...(changes.url !== undefined && { url: changes.url }),
                        ...(changes.publishedAt !== undefined && { published_at: changes.publishedAt }),
                    })
                    .eq('id', id)

                if (error) {
                    return { error: mapNewsError(error, 'redigere denne nyhed') }
                }

                return { data: undefined }
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'News', id },
                { type: 'News', id: 'LIST' },
            ],
        }),

        deleteNews: builder.mutation<void, { id: string }>({
            queryFn: async ({ id }) => {
                const { error } = await supabase.from('news').delete().eq('id', id)

                if (error) {
                    return { error: mapNewsError(error, 'slette denne nyhed') }
                }

                return { data: undefined }
            },
            invalidatesTags: [{ type: 'News', id: 'LIST' }],
        }),

        getNewsSource: builder.query<NewsSource | null, void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('news_sources')
                        .select('id, organisation_id, endpoint_url, api_key')
                        .eq('organisation_id', organisationId)
                        .maybeSingle()

                    if (error) {
                        return { error: { status: 'CUSTOM_ERROR', error: error.message } }
                    }

                    if (!data) return { data: null }

                    return {
                        data: {
                            id: data.id,
                            organisationId: data.organisation_id,
                            endpointUrl: data.endpoint_url,
                            apiKey: data.api_key,
                        },
                    }
                } catch (err: any) {
                    return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved hentning af nyheds-API' } }
                }
            },
            providesTags: ['NewsSource'],
        }),

        upsertNewsSource: builder.mutation<void, UpsertNewsSourceInput>({
            queryFn: async ({ endpointUrl, apiKey }) => {
                try {
                    const trimmedUrl = endpointUrl.trim()
                    if (!trimmedUrl) {
                        return { error: { status: 'CUSTOM_ERROR', error: 'Nyheds-API-adressen skal udfyldes.' } }
                    }

                    const organisationId = await getAuthenticatedOrganisationId()

                    const { error } = await supabase
                        .from('news_sources')
                        .upsert(
                            {
                                organisation_id: organisationId,
                                endpoint_url: trimmedUrl,
                                api_key: apiKey?.trim() || null,
                                updated_at: new Date().toISOString(),
                            },
                            { onConflict: 'organisation_id' },
                        )

                    if (error) {
                        return { error: mapNewsError(error, 'konfigurere nyheds-API for organisationen') }
                    }

                    return { data: undefined }
                } catch (err: any) {
                    return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved gemning af nyheds-API' } }
                }
            },
            invalidatesTags: ['NewsSource'],
        }),

        // US-57: henter nyheder fra organisationens konfigurerede API og
        // importerer dem. Admin-trigget (ingen cron/edge function i dette
        // repo) - bruger samme autentificerede skrive-vej som manuel
        // oprettelse, ikke en service-role-proces.
        fetchFromNewsSource: builder.mutation<number, void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

                    const { data: sourceRow, error: sourceError } = await supabase
                        .from('news_sources')
                        .select('endpoint_url, api_key')
                        .eq('organisation_id', organisationId)
                        .maybeSingle()

                    if (sourceError) {
                        return { error: { status: 'CUSTOM_ERROR', error: sourceError.message } }
                    }

                    if (!sourceRow) {
                        return { error: { status: 'CUSTOM_ERROR', error: 'Ingen nyheds-API er konfigureret for organisationen endnu.' } }
                    }

                    let response: Response
                    try {
                        response = await fetch(sourceRow.endpoint_url, {
                            headers: sourceRow.api_key ? { Authorization: `Bearer ${sourceRow.api_key}` } : undefined,
                        })
                    } catch {
                        // US-57 AC: "Hvis API'et ikke er tilgængeligt,
                        // håndteres fejlen uden at resten af Ponos stopper."
                        return { error: { status: 'CUSTOM_ERROR', error: "Nyheds-API'et kunne ikke kontaktes. Prøv igen senere." } }
                    }

                    if (!response.ok) {
                        return { error: { status: 'CUSTOM_ERROR', error: `Nyheds-API'et svarede med fejl (${response.status}).` } }
                    }

                    let items: ExternalNewsItem[]
                    try {
                        const body = await response.json()
                        if (!Array.isArray(body)) throw new Error('not an array')
                        items = body
                    } catch {
                        return { error: { status: 'CUSTOM_ERROR', error: "Nyheds-API'et returnerede uventet data." } }
                    }

                    const rows = items
                        .filter((item) => typeof item?.title === 'string' && item.title.trim())
                        .map((item) => ({
                            organisation_id: organisationId,
                            title: item.title.trim(),
                            description: item.description ?? null,
                            picture_url: item.imageUrl ?? null,
                            url: item.url ?? null,
                            ...(item.publishedAt ? { published_at: item.publishedAt } : {}),
                            source: 'api',
                            external_ref: deriveExternalRef(item),
                        }))

                    if (rows.length === 0) {
                        return { data: 0 }
                    }

                    const { data: inserted, error: insertError } = await supabase
                        .from('news')
                        .upsert(rows, { onConflict: 'organisation_id,external_ref', ignoreDuplicates: true })
                        .select('id')

                    if (insertError) {
                        return { error: mapNewsError(insertError, 'importere nyheder for organisationen') }
                    }

                    return { data: inserted?.length ?? 0 }
                } catch (err: any) {
                    return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved hentning af nyheder fra API' } }
                }
            },
            invalidatesTags: [{ type: 'News', id: 'LIST' }],
        }),
    }),
})

export const {
    useGetNewsQuery,
    useGetNewsByIdQuery,
    useCreateNewsMutation,
    useUpdateNewsMutation,
    useDeleteNewsMutation,
    useGetNewsSourceQuery,
    useUpsertNewsSourceMutation,
    useFetchFromNewsSourceMutation,
} = newsApi
