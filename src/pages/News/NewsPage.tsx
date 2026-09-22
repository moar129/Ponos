// src/pages/News/NewsPage.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Newspaper, Plus } from 'lucide-react'
import { useDeleteNewsMutation, useGetNewsQuery } from '../../store/apis/newsApi'
import {
    CREATE_NEWS_PRIVILEGE,
    DELETE_NEWS_PRIVILEGE,
    READ_NEWS_PRIVILEGE,
    UPDATE_NEWS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import { NewsCard } from '../../components/News/NewsCard'
import { NewsFormModal } from '../../components/News/NewsFormModal'
import type { News } from '../../types/news/newsType'


// US-56: nyheder er organisationens egne (opslagstavle-stil) - admin
// opretter/redigerer/sletter dem manuelt. Fase 3: create/read/update/
// delete_news er nu uafhængige privilegier i stedet for ét manage_news.
export function NewsPage() {
    const { t } = useTranslation(['news', 'common'])
    const { data: news, isLoading, error: listError } = useGetNewsQuery()
    const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_NEWS_PRIVILEGE)
    const { hasPrivilege: canRead, isLoading: loadingReadPrivilege } = useHasPrivilege(READ_NEWS_PRIVILEGE)
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_NEWS_PRIVILEGE)
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_NEWS_PRIVILEGE)
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Newspaper className="w-6 h-6 text-secondary dark:text-slate-400" />
                    <h1 className="text-xl font-semibold text-primary dark:text-slate-100">{t('heading')}</h1>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-accent text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('create')}
                    </button>
                )}
            </div>

            {errorMessage && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2">
                    {errorMessage}
                </div>
            )}

            {isLoading || loadingReadPrivilege ? (
                <p className="text-secondary dark:text-slate-400">{t('loading')}</p>
            ) : !canRead ? (
                <p className="text-secondary dark:text-slate-400">{t('noAccess')}</p>
            ) : !news || news.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('empty')}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {news.map((item) => (
                        <NewsCard
                            key={item.id}
                            news={item}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            <NewsFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} editingNews={editingNews} />

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-border-gray dark:border-slate-700 rounded-lg shadow-xl p-5">
                        <p className="text-sm text-primary dark:text-slate-100 font-medium mb-1">{t('deleteTitle', { name: deleteTarget.title })}</p>
                        <p className="text-sm text-secondary dark:text-slate-400 mb-4">{t('common:cannotUndo')}</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="bg-red-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                                {deleting ? t('common:deleting') : t('common:delete')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="rounded-md border border-border-gray dark:border-slate-700 bg-bg-gray dark:bg-slate-800 px-4 py-2 text-sm font-medium text-secondary dark:text-slate-400 hover:bg-border-gray dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                            >
                                {t('common:cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
