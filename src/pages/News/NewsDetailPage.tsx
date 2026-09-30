// src/pages/News/NewsDetailPage.tsx
import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useGetNewsByIdQuery } from '../../store/apis/newsApi'
import { DELETE_NEWS_PRIVILEGE, UPDATE_NEWS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { NewsFormModal } from '../../components/News/NewsFormModal'
import { NewsImage } from '../../components/News/NewsImage'
import { NewsActions } from '../../components/News/NewsActions'
import { DeleteNewsDialog } from '../../components/News/DeleteNewsDialog'
import { Alert } from '../../components/common/Alert'
import { isRichText, sanitizeRichText } from '../../lib/richText'
import { formatDate } from '../../utils/formatDate'



// Enkelt-nyhed (/nyheder/:id) - åbnes ved klik fra Nyhedssiden eller
// Dashboardets Oversigt-preview. RLS afgrænser allerede til egen
// organisation, så et link til en anden organisations nyhed giver et
// almindeligt "ikke fundet".
export function NewsDetailPage() {
    const { t } = useTranslation(['news', 'common'])
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: news, isLoading, error: queryError } = useGetNewsByIdQuery(id ?? '', { skip: !id })
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_NEWS_PRIVILEGE)
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_NEWS_PRIVILEGE)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)


    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100 max-w-4xl mx-auto space-y-6">
            <Link to="/nyheder" className="flex items-center gap-1 text-sm text-accent hover:underline w-fit">
                <ArrowLeft className="w-4 h-4" />
                {t('backToNews')}
            </Link>

            {isLoading ? (
                <p className="text-secondary dark:text-slate-400">{t('loadingOne')}</p>
            ) : !news ? (
                <Alert>{readableError(queryError) ?? t('notFound')}</Alert>
            ) : (
                <article className="rounded-lg border border-border-gray dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                    <NewsImage
                        key={news.pictureUrl}
                        pictureUrl={news.pictureUrl}
                        className="w-full max-h-96 object-cover"
                        placeholderClassName="w-full h-56 sm:h-72"
                    />
                    <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-bold text-primary dark:text-slate-100 leading-tight break-words">{news.title}</h1>
                                <p className="text-sm text-secondary dark:text-slate-400 mt-1">{formatDate(news.publishedAt)}</p>
                            </div>

                            <NewsActions
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                onEdit={() => setIsFormOpen(true)}
                                onDelete={() => setConfirmingDelete(true)}
                            />
                        </div>

                        {/* Nyheder oprettet før rich text-editoren er ren tekst og
                            vises som hidtil; formateret indhold saniteres igen her,
                            så en gammel række aldrig kan nå DOM'en urørt. */}
                        {news.description &&
                            (isRichText(news.description) ? (
                                <div
                                    className="rich-text text-secondary dark:text-slate-400 mt-4"
                                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(news.description) }}
                                />
                            ) : (
                                <p className="text-secondary dark:text-slate-400 mt-4 whitespace-pre-wrap">{news.description}</p>
                            ))}

                        {news.url && (
                            <a
                                href={news.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-accent hover:underline mt-4 w-fit"
                            >
                                {t('readFullArticle')}
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                </article>
            )}

            {news && <NewsFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} editingNews={news} />}

            <DeleteNewsDialog
                news={confirmingDelete ? news ?? null : null}
                onCancel={() => setConfirmingDelete(false)}
                onDeleted={() => navigate('/nyheder')}
            />
        </div>
    )
}
