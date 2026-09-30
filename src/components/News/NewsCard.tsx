// src/components/News/NewsCard.tsx
import { useNavigate } from 'react-router-dom'
import { richTextToPlainText } from '../../lib/richText'
import { formatDate } from '../../utils/formatDate'
import type { NewsCardProps } from '../../types/news/newsType'
import { NewsImage } from './NewsImage'
import { NewsActions } from './NewsActions'

// Ét nyhedskort - US-56's acceptkriterier (titel, beskrivelse, evt.
// billede, dato). Rediger/slet vises uafhængigt af hinanden (Fase 3:
// update_news hhv. delete_news). Kortet er klikbart og åbner
// /nyheder/:id - rediger/slet-knapperne stopper propagation, så de ikke
// også trigger navigation.
export function NewsCard({ news, canUpdate, canDelete, onEdit, onDelete }: NewsCardProps) {
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
            <NewsImage key={news.pictureUrl} pictureUrl={news.pictureUrl} className="w-full aspect-video object-cover" />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-primary dark:text-slate-100">{news.title}</h3>
                        <p className="text-xs text-secondary dark:text-slate-400 mt-0.5">{formatDate(news.publishedAt)}</p>
                    </div>

                    <NewsActions
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        onEdit={() => onEdit(news)}
                        onDelete={() => onDelete(news)}
                    />
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
