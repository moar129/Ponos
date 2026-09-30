// src/pages/News/NewsPage.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Newspaper, Plus } from 'lucide-react'
import { useGetNewsQuery } from '../../store/apis/newsApi'
import {
    CREATE_NEWS_PRIVILEGE,
    DELETE_NEWS_PRIVILEGE,
    READ_NEWS_PRIVILEGE,
    UPDATE_NEWS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi'
import { NewsCard } from '../../components/News/NewsCard'
import { NewsFormModal } from '../../components/News/NewsFormModal'
import { DeleteNewsDialog } from '../../components/News/DeleteNewsDialog'
import { Alert } from '../../components/common/Alert'
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


    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Newspaper className="w-6 h-6 text-secondary dark:text-slate-400" />
                    <h1 className="text-xl font-semibold text-primary dark:text-slate-100">{t('heading')}</h1>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-accent text-accent-text rounded-md px-4 py-2 text-sm font-medium hover:bg-accent-hover transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('create')}
                    </button>
                )}
            </div>

            <Alert>{readableError(listError)}</Alert>

            {isLoading || loadingReadPrivilege ? (
                <p className="text-secondary dark:text-slate-400">{t('loading')}</p>
            ) : !canRead ? (
                <p className="text-secondary dark:text-slate-400">{t('noAccess')}</p>
            ) : !news || news.length === 0 ? (
                <p className="text-secondary dark:text-slate-400">{t('empty')}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
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

            <DeleteNewsDialog
                news={deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onDeleted={() => setDeleteTarget(null)}
            />
        </div>
    )
}
