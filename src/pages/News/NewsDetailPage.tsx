// src/pages/News/NewsDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useDeleteNewsMutation, useGetNewsByIdQuery } from '../../store/apis/newsApi'
import { MANAGE_NEWS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { NewsFormModal } from '../../components/News/NewsFormModal'

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
    const { hasPrivilege: canManage } = useHasPrivilege(MANAGE_NEWS_PRIVILEGE)
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
        <div className="space-y-6 max-w-3xl mx-auto">
            <Link to="/nyheder" className="flex items-center gap-1 text-sm text-secondary hover:text-primary w-fit">
                <ArrowLeft className="w-4 h-4" />
                Tilbage til nyheder
            </Link>

            {isLoading ? (
                <p className="text-secondary">Indlæser nyhed...</p>
            ) : !news ? (
                <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {errorMessage ?? 'Nyheden blev ikke fundet.'}
                </div>
            ) : (
                <article className="rounded-lg border border-border-gray overflow-hidden bg-white">
                    {news.pictureUrl && (
                        <img src={news.pictureUrl} alt="" className="w-full max-h-96 object-cover" />
                    )}
                    <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-xl font-semibold text-primary">{news.title}</h1>
                                <p className="text-sm text-secondary mt-1">{formatDate(news.publishedAt)}</p>
                            </div>

                            {canManage && (
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(true)}
                                        aria-label="Rediger nyhed"
                                        className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-bg-gray transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingDelete(true)}
                                        aria-label="Slet nyhed"
                                        className="p-1.5 rounded-md text-secondary hover:text-red-700 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {errorMessage && (
                            <div className="mt-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                                {errorMessage}
                            </div>
                        )}

                        {news.description && (
                            <p className="text-secondary mt-4 whitespace-pre-wrap">{news.description}</p>
                        )}

                        {news.url && (
                            <a
                                href={news.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-primary hover:underline mt-4 w-fit"
                            >
                                Læs mere
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </article>
            )}

            {news && <NewsFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} editingNews={news} />}

            {confirmingDelete && news && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-5">
                        <p className="text-sm text-primary font-medium mb-1">Slet "{news.title}"?</p>
                        <p className="text-sm text-secondary mb-4">Dette kan ikke fortrydes.</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="bg-red-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-60"
                            >
                                {deleting ? 'Sletter...' : 'Slet'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                disabled={deleting}
                                className="rounded-md border border-border-gray px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray transition-colors disabled:opacity-60"
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
