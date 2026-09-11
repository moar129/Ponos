// src/components/News/NewsCard.tsx
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { richTextToPlainText } from '../../lib/richText'
import type { NewsCardProps } from '../../types/news/newsType'

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

// Ét nyhedskort - US-56's acceptkriterier (titel, beskrivelse, evt.
// billede, dato). Rediger/slet vises kun når canManage (manage_news).
// Kortet er klikbart og åbner /nyheder/:id - rediger/slet-knapperne
// stopper propagation, så de ikke også trigger navigation.
export function NewsCard({ news, canManage, onEdit, onDelete }: NewsCardProps) {
    const navigate = useNavigate()

    return (
        <div
            onClick={() => navigate(`/nyheder/${news.id}`)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/nyheder/${news.id}`)
            }}
            role="link"
            tabIndex={0}
            className="rounded-lg border border-border-gray overflow-hidden bg-white cursor-pointer hover:border-primary transition-colors"
        >
            {news.pictureUrl && (
                <img src={news.pictureUrl} alt="" className="w-full h-40 object-cover" />
            )}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-semibold text-primary">{news.title}</h3>
                        <p className="text-xs text-secondary mt-0.5">{formatDate(news.publishedAt)}</p>
                    </div>

                    {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEdit(news)
                                }}
                                aria-label="Rediger nyhed"
                                className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-bg-gray transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDelete(news)
                                }}
                                aria-label="Slet nyhed"
                                className="p-1.5 rounded-md text-secondary hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Uddrag som ren tekst - en formateret beskrivelse ville ellers
                    vise rå tags gennem line-clamp. */}
                {news.description && (
                    <p className="text-sm text-secondary mt-3 line-clamp-3 whitespace-pre-wrap">
                        {richTextToPlainText(news.description)}
                    </p>
                )}
            </div>
        </div>
    )
}
