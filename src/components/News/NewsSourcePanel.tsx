// src/components/News/NewsSourcePanel.tsx
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, Rss } from 'lucide-react'
import {
    useFetchFromNewsSourceMutation,
    useGetNewsSourceQuery,
    useUpsertNewsSourceMutation,
} from '../../store/apis/newsApi'

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// US-57: lader organisationen konfigurere sin egen eksterne nyheds-API +
// hente derfra på forespørgsel. Ingen cron/edge function i dette repo -
// "Hent nu" er admin-trigget og bruger samme autentificerede skrive-vej
// som manuel oprettelse. Kun vist til manage_news-indehavere (gated i
// NewsPage), da api_key er credential-agtig data.
export function NewsSourcePanel() {
    const { data: source, isLoading } = useGetNewsSourceQuery()
    const [upsertSource, { isLoading: saving, error: saveError }] = useUpsertNewsSourceMutation()
    const [fetchNow, { isLoading: fetching, error: fetchError }] = useFetchFromNewsSourceMutation()

    const [endpointUrl, setEndpointUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [savedMessage, setSavedMessage] = useState(false)
    const [importMessage, setImportMessage] = useState<string | null>(null)

    useEffect(() => {
        if (source) {
            setEndpointUrl(source.endpointUrl)
            setApiKey(source.apiKey ?? '')
        }
    }, [source])

    async function handleSave(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSavedMessage(false)
        try {
            await upsertSource({ endpointUrl, apiKey: apiKey || null }).unwrap()
            setSavedMessage(true)
        } catch {
            // Fejlen vises via saveError.
        }
    }

    async function handleFetchNow() {
        setImportMessage(null)
        try {
            const count = await fetchNow().unwrap()
            setImportMessage(count > 0 ? `${count} ny(e) nyhed(er) importeret.` : 'Ingen nye nyheder fundet.')
        } catch {
            // Fejlen vises via fetchError.
        }
    }

    const saveErrorMessage = readableError(saveError)
    const fetchErrorMessage = readableError(fetchError)

    if (isLoading) {
        return <p className="text-secondary text-sm">Indlæser nyheds-API...</p>
    }

    return (
        <div className="rounded-lg border border-border-gray p-5">
            <div className="flex items-center gap-2 mb-4">
                <Rss className="w-5 h-5 text-secondary" />
                <h3 className="font-semibold text-primary">Nyheds-API</h3>
            </div>

            <p className="text-sm text-secondary mb-4">
                Konfigurer organisationens eksterne nyheds-API. Forventet svarformat: en JSON-liste af objekter med
                <code className="mx-1 bg-bg-gray px-1 py-0.5 rounded text-xs">title</code>,
                <code className="mx-1 bg-bg-gray px-1 py-0.5 rounded text-xs">description</code>,
                <code className="mx-1 bg-bg-gray px-1 py-0.5 rounded text-xs">imageUrl</code>,
                <code className="mx-1 bg-bg-gray px-1 py-0.5 rounded text-xs">publishedAt</code> og
                <code className="mx-1 bg-bg-gray px-1 py-0.5 rounded text-xs">url</code> (link til original-artiklen).
            </p>

            {(saveErrorMessage || fetchErrorMessage) && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {saveErrorMessage ?? fetchErrorMessage}
                </div>
            )}

            {savedMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    Nyheds-API'en er gemt.
                </div>
            )}

            {importMessage && (
                <div className="mb-4 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
                    {importMessage}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
                <div>
                    <label className="block text-sm text-secondary mb-1" htmlFor="news-source-url">API-adresse</label>
                    <input
                        id="news-source-url"
                        type="text"
                        value={endpointUrl}
                        onChange={(e) => setEndpointUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-md border border-border-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div>
                    <label className="block text-sm text-secondary mb-1" htmlFor="news-source-key">API-nøgle (valgfri)</label>
                    <input
                        id="news-source-key"
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full rounded-md border border-border-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={saving || !endpointUrl.trim()}
                        className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                        {saving ? 'Gemmer...' : 'Gem API'}
                    </button>
                    <button
                        type="button"
                        onClick={handleFetchNow}
                        disabled={fetching || !source}
                        className="flex items-center gap-2 rounded-md border border-border-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
                    >
                        <Download className="w-4 h-4" />
                        {fetching ? 'Henter...' : 'Hent nyheder nu'}
                    </button>
                </div>
            </form>
        </div>
    )
}
