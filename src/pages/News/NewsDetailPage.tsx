// src/pages/News/NewsDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useDeleteNewsMutation, useGetNewsByIdQuery } from '../../store/apis/newsApi'
import { DELETE_NEWS_PRIVILEGE, UPDATE_NEWS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { NewsFormModal } from '../../components/News/NewsFormModal'
import { isRichText, sanitizeRichText } from '../../lib/richText'

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

// Enkelt-nyhed (/nyheder/:id) - åbnes ved klik fra Nyhedssiden eller
// Dashboardets Oversigt-preview. RLS afgrænser allerede til egen
// organisation, så et link til en anden organisations nyhed giver et
// almindeligt "ikke fundet".
export function NewsDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: news, isLoading, error: queryError } = useGetNewsByIdQuery(id ?? '', { skip: !id })
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_NEWS_PRIVILEGE)
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_NEWS_PRIVILEGE)
    const [deleteNews, { isLoading: deleting, error: deleteError }] = useDeleteNewsMutation()

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    async function handleDelete() {
        if (!news) return
        try {
            await deleteNews({ id: news.id }).unwrap()
            navigate('/nyheder')
        } catch {
            // Fejlen vises via deleteError - bekræftelses-boksen lukkes ikke.
        }
    }

    const errorMessage = readableError(queryError) ?? readableError(deleteError)

    return (
        <div className="bg-surface rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-slate-100 max-w-8xl mx-auto space-y-6">
            <Link to="/nyheder" className="flex items-center gap-1 text-sm text-accent hover:underline w-fit">
                <ArrowLeft className="w-4 h-4" />
                Tilbage til nyheder
            </Link>

            {isLoading ? (
                <p className="text-slate-400">Indlæser nyhed...</p>
            ) : !news ? (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                    {errorMessage ?? 'Nyheden blev ikke fundet.'}
                </div>
            ) : (
                <article className="rounded-lg border border-slate-800 overflow-hidden bg-surface">
                    {news.pictureUrl && (
                        <img src={news.pictureUrl} alt="" className="w-full max-h-96 object-cover" />
                    )}
                    <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 leading-tight">{news.title}</h1>
                                <p className="text-sm text-slate-400 mt-1">{formatDate(news.publishedAt)}</p>
                            </div>

                            {(canUpdate || canDelete) && (
                                <div className="flex items-center gap-1 shrink-0">
                                    {canUpdate && (
                                        <button
                                            type="button"
                                            onClick={() => setIsFormOpen(true)}
                                            aria-label="Rediger nyhed"
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmingDelete(true)}
                                            aria-label="Slet nyhed"
                                            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {errorMessage && (
                            <div className="mt-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2">
                                {errorMessage}
                            </div>
                        )}

                        {/* Nyheder oprettet før rich text-editoren er ren tekst og
                            vises som hidtil; formateret indhold saniteres igen her,
                            så en gammel række aldrig kan nå DOM'en urørt. */}
                        {news.description &&
                            (isRichText(news.description) ? (
                                <div
                                    className="rich-text text-slate-300 mt-4"
                                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(news.description) }}
                                />
                            ) : (
                                <p className="text-slate-300 mt-4 whitespace-pre-wrap">{news.description}</p>
                            ))}

                        {news.url && (
                            <a
                                href={news.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-accent hover:underline mt-4 w-fit"
                            >
                                Læs hele artiklen
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </article>
            )}

            {news && <NewsFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} editingNews={news} />}

            {confirmingDelete && news && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm bg-surface border border-slate-800 rounded-lg shadow-xl p-5">
                        <p className="text-sm text-slate-100 font-medium mb-1">Slet "{news.title}"?</p>
                        <p className="text-sm text-slate-400 mb-4">Dette kan ikke fortrydes.</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-red-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                                {deleting ? 'Sletter...' : 'Slet'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                disabled={deleting}
                                className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-60"
                            >
                                Annuller
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
