// src/store/apis/newsApi.ts
import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { CreateNewsInput, News, UpdateNewsInput } from '../../types/news/newsType'

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
}): News {
    return {
        id: row.id,
        organisationId: row.organisation_id,
        title: row.title,
        description: row.description,
        pictureUrl: row.picture_url,
        publishedAt: row.published_at,
        url: row.url,
    }
}

export const newsApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getNews: builder.query<News[], void>({
            queryFn: async () => {
                try {
                    const organisationId = await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('news')
                        .select('id, organisation_id, title, description, picture_url, published_at, url')
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
                    .select('id, organisation_id, title, description, picture_url, published_at, url')
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
                        })
                        .select('id, organisation_id, title, description, picture_url, published_at, url')
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
    }),
})

export const {
    useGetNewsQuery,
    useGetNewsByIdQuery,
    useCreateNewsMutation,
    useUpdateNewsMutation,
    useDeleteNewsMutation,
} = newsApi
