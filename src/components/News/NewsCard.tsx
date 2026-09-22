// src/components/News/NewsCard.tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { richTextToPlainText } from '../../lib/richText'
import { formatDate } from '../../utils/formatDate'
import type { NewsCardProps } from '../../types/news/newsType'

// Ét nyhedskort - US-56's acceptkriterier (titel, beskrivelse, evt.
// billede, dato). Rediger/slet vises uafhængigt af hinanden (Fase 3:
// update_news hhv. delete_news). Kortet er klikbart og åbner
// /nyheder/:id - rediger/slet-knapperne stopper propagation, så de ikke
// også trigger navigation.
export function NewsCard({ news, canUpdate, canDelete, onEdit, onDelete }: NewsCardProps) {
  const { t } = useTranslation(['news', 'common'])
    const navigate = useNavigate()

    return (
        <div
            onClick={() => navigate(`/nyheder/${news.id}`)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/nyheder/${news.id}`)
            }}
            role="link"
            tabIndex={0}
            className="rounded-lg border border-border-gray dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 cursor-pointer hover:border-accent transition-colors"
        >
            {news.pictureUrl && (
                <img src={news.pictureUrl} alt="" className="w-full h-40 object-cover" />
            )}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-primary dark:text-slate-100">{news.title}</h3>
                        <p className="text-xs text-secondary dark:text-slate-400 mt-0.5">{formatDate(news.publishedAt)}</p>
                    </div>

                    {(canUpdate || canDelete) && (
                        <div className="flex items-center gap-1 shrink-0">
                            {canUpdate && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEdit(news)
                                    }}
                                    aria-label={t('edit')}
                                    className="p-1.5 rounded-md text-secondary dark:text-slate-400 hover:text-primary dark:hover:text-slate-100 hover:bg-bg-gray dark:hover:bg-slate-700 transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete(news)
                                    }}
                                    aria-label={t('delete')}
                                    className="p-1.5 rounded-md text-secondary dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Uddrag som ren tekst - en formateret beskrivelse ville ellers
                    vise rå tags gennem line-clamp. */}
                {news.description && (
                    <p className="text-sm text-secondary dark:text-slate-400 mt-3 line-clamp-3 whitespace-pre-wrap">
                        {richTextToPlainText(news.description)}
                    </p>
                )}
            </div>
        </div>
    )
}
