// src/components/dashboard/NewsSlider.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'
import { useGetNewsQuery } from '../../store/apis/newsApi'
import { richTextToPlainText } from '../../lib/richText'
import { formatDayMonth } from '../../utils/formatDate'
import { NewsImage } from '../News/NewsImage'
import { useTranslation } from 'react-i18next'

const MAX_SLIDES = 10
const AUTO_ADVANCE_MS = 6000

// US-56: Dashboard-Oversigtens nyheds-widget - kører automatisk
// igennem de seneste MAX_SLIDES nyheder, med manuel prev/next + dots.
// Pause på hover, så man kan nå at læse/klikke uden at den skifter under en.
export function NewsSlider() {
    const { t } = useTranslation('dashboard')
    const { data: news, isLoading } = useGetNewsQuery()
    const slides = (news ?? []).slice(0, MAX_SLIDES)

    const [index, setIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    // Falder tilbage til første slide hvis listen bliver kortere end index
    // (fx en nyhed slettes af en anden bruger, mens siden er åben) -
    // afledt under render i stedet for at rette state i en effect.
    const safeIndex = index < slides.length ? index : 0

    useEffect(() => {
        if (isPaused || slides.length <= 1) return
        const timer = setInterval(() => {
            setIndex((i) => (i + 1) % slides.length)
        }, AUTO_ADVANCE_MS)
        return () => clearInterval(timer)
    }, [isPaused, slides.length])

    function goTo(next: number) {
        setIndex((next + slides.length) % slides.length)
    }

    const current = slides[safeIndex] as (typeof slides)[number] | undefined

    return (
        <div className="rounded-lg border border-border-gray bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-secondary dark:text-slate-400" />
                    <h3 className="font-medium text-primary dark:text-slate-100">{t('news.title')}</h3>
                </div>
                <Link to="/nyheder" className="flex items-center gap-1 text-sm text-accent hover:underline shrink-0">
                    {t('news.seeAll')}
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {isLoading ? (
                <p className="text-sm text-secondary dark:text-slate-400">{t('news.loading')}</p>
            ) : !current ? (
                <p className="text-sm text-secondary dark:text-slate-400">{t('news.empty')}</p>
            ) : (
                <div
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className="relative rounded-md overflow-hidden border border-border-gray dark:border-slate-700"
                >
                    {/* Billedet (eller standardbilledet) er selve baggrunden. */}
                    <Link to={`/nyheder/${current.id}`} className="block relative h-48 sm:h-56">
                        <NewsImage
                            key={current.pictureUrl}
                            pictureUrl={current.pictureUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:px-12">
                            <p className="font-medium text-white truncate">{current.title}</p>
                            <p className="text-xs text-white/80 mt-0.5">{formatDayMonth(current.publishedAt)}</p>
                            {current.description && (
                                <p className="text-sm text-white/90 mt-1 line-clamp-2">{richTextToPlainText(current.description)}</p>
                            )}
                        </div>
                    </Link>

                    {slides.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => goTo(safeIndex - 1)}
                                aria-label={t('news.previous')}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow-sm text-secondary hover:text-primary transition-colors dark:bg-slate-800/90 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(safeIndex + 1)}
                                aria-label={t('news.next')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow-sm text-secondary hover:text-primary transition-colors dark:bg-slate-800/90 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                                {slides.map((slide, i) => (
                                    <button
                                        key={slide.id}
                                        type="button"
                                        onClick={() => goTo(i)}
                                        aria-label={t('news.showNews', { number: i + 1 })}
                                        aria-current={i === safeIndex}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                            i === safeIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/80'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
