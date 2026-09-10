// src/components/dashboard/NewsSlider.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react'
import { useGetNewsQuery } from '../../store/apis/newsApi'

const MAX_SLIDES = 10
const AUTO_ADVANCE_MS = 6000

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })
}

// US-56/US-57: Dashboard-Oversigtens nyheds-widget - kører automatisk
// igennem de seneste MAX_SLIDES nyheder, med manuel prev/next + dots.
// Pause på hover, så man kan nå at læse/klikke uden at den skifter under en.
export function NewsSlider() {
    const { data: news, isLoading } = useGetNewsQuery()
    const slides = (news ?? []).slice(0, MAX_SLIDES)

    const [index, setIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    // Nulstil til første slide hvis listen bliver kortere end nuværende index
    // (fx en nyhed slettes af en anden bruger, mens siden er åben).
    useEffect(() => {
        if (index >= slides.length) setIndex(0)
    }, [slides.length, index])

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

    const current = slides[index] as (typeof slides)[number] | undefined
    const hasImage = !!current?.pictureUrl

    return (
        <div className="rounded-lg border border-border-gray p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-secondary" />
                    <h3 className="font-medium text-primary">Nyheder</h3>
                </div>
                <Link to="/nyheder" className="flex items-center gap-1 text-sm text-primary hover:underline shrink-0">
                    Se alle nyheder
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {isLoading ? (
                <p className="text-sm text-secondary">Indlæser nyheder...</p>
            ) : !current ? (
                <p className="text-sm text-secondary">Der er ingen nyheder endnu.</p>
            ) : (
                <div
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className="relative rounded-md overflow-hidden border border-border-gray"
                >
                    {/* Billedet er selve baggrunden når sat - ellers ren hvid baggrund. */}
                    <Link
                        to={`/nyheder/${current.id}`}
                        className="block relative h-48 sm:h-56"
                        style={hasImage ? { backgroundImage: `url(${current.pictureUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    >
                        {hasImage ? (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4 sm:px-12">
                                    <p className="font-medium text-white truncate">{current.title}</p>
                                    <p className="text-xs text-white/80 mt-0.5">{formatDate(current.publishedAt)}</p>
                                    {current.description && (
                                        <p className="text-sm text-white/90 mt-1 line-clamp-2">{current.description}</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className={`h-full flex flex-col justify-center bg-white p-4 sm:px-12 ${slides.length > 1 ? 'pb-8' : ''}`}>
                                <p className="font-medium text-primary truncate">{current.title}</p>
                                <p className="text-xs text-secondary mt-0.5">{formatDate(current.publishedAt)}</p>
                                {current.description && (
                                    <p className="text-sm text-secondary mt-1 line-clamp-2">{current.description}</p>
                                )}
                            </div>
                        )}
                    </Link>

                    {slides.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => goTo(index - 1)}
                                aria-label="Forrige nyhed"
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow-sm text-secondary hover:text-primary transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => goTo(index + 1)}
                                aria-label="Næste nyhed"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow-sm text-secondary hover:text-primary transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                                {slides.map((slide, i) => (
                                    <button
                                        key={slide.id}
                                        type="button"
                                        onClick={() => goTo(i)}
                                        aria-label={`Vis nyhed ${i + 1}`}
                                        aria-current={i === index}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                            i === index
                                                ? hasImage
                                                    ? 'bg-white'
                                                    : 'bg-primary'
                                                : hasImage
                                                  ? 'bg-white/50 hover:bg-white/80'
                                                  : 'bg-border-gray hover:bg-secondary'
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
