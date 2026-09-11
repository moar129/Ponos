// src/pages/News/NewsPage.tsx
import { useState } from 'react'
import { Newspaper, Plus } from 'lucide-react'
import { useDeleteNewsMutation, useGetNewsQuery } from '../../store/apis/newsApi'
import { MANAGE_NEWS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { NewsCard } from '../../components/News/NewsCard'
import { NewsFormModal } from '../../components/News/NewsFormModal'
import type { News } from '../../types/news/newsType'

function readableError(err: unknown): string | null {
    if (!err) return null
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error
    }
    return 'Noget gik galt. Prøv igen.'
}

// US-56: nyheder er organisationens egne (opslagstavle-stil) - admin
// opretter/redigerer/sletter dem manuelt, gated bag manage_news.
export function NewsPage() {
    const { data: news, isLoading, error: listError } = useGetNewsQuery()
    const { hasPrivilege: canManage } = useHasPrivilege(MANAGE_NEWS_PRIVILEGE)
    const [deleteNews, { isLoading: deleting, error: deleteError }] = useDeleteNewsMutation()

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingNews, setEditingNews] = useState<News | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<News | null>(null)

    function openCreate() {
        setEditingNews(null)
        setIsFormOpen(true)
    }

    function openEdit(item: News) {
        setEditingNews(item)
        setIsFormOpen(true)
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        try {
            await deleteNews({ id: deleteTarget.id }).unwrap()
            setDeleteTarget(null)
        } catch {
            // Fejlen vises via deleteError - bekræftelses-boksen lukkes ikke,
            // så brugeren kan se fejlen og evt. prøve igen.
        }
    }

    const errorMessage = readableError(listError) ?? readableError(deleteError)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Newspaper className="w-6 h-6 text-secondary" />
                    <h1 className="text-xl font-semibold text-primary">Nyheder</h1>
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Opret nyhed
                    </button>
                )}
            </div>

            {errorMessage && (
                <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                    {errorMessage}
                </div>
            )}

            {isLoading ? (
                <p className="text-secondary">Indlæser nyheder...</p>
            ) : !news || news.length === 0 ? (
                <p className="text-secondary">Der er ingen nyheder endnu.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {news.map((item) => (
                        <NewsCard
                            key={item.id}
                            news={item}
                            canManage={canManage}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            <NewsFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} editingNews={editingNews} />

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-5">
                        <p className="text-sm text-primary font-medium mb-1">Slet "{deleteTarget.title}"?</p>
                        <p className="text-sm text-secondary mb-4">Dette kan ikke fortrydes.</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="bg-red-700 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-60"
                            >
                                {deleting ? 'Sletter...' : 'Slet'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
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
