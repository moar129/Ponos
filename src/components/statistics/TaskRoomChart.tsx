import { useTranslation } from 'react-i18next'
import type { TaskRoomChartProps } from '../../types/statistics/statisticsComponentTypes'

const COMPLETED_COLOR = 'var(--color-accent)'
const OPEN_COLOR = 'var(--chart-neutral)'

// Stacked horizontal bars: completed + open per room, scaled to the
// busiest room. Two series, so a legend is always shown.
export function TaskRoomChart({ data }: TaskRoomChartProps) {
    const { t } = useTranslation('statistics')
    const max = Math.max(0, ...data.map((room) => room.total))

    return (
        <div>
            <div className="mb-3 flex gap-5">
                {[
                    { key: 'completed', color: COMPLETED_COLOR, label: t('rooms.completed') },
                    { key: 'open', color: OPEN_COLOR, label: t('rooms.open') },
                ].map((series) => (
                    <div key={series.key} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: series.color }} />
                        <span className="text-xs text-secondary dark:text-slate-400">{series.label}</span>
                    </div>
                ))}
            </div>

            <ul aria-label={t('rooms.title')} className="space-y-2.5">
                {data.map((room) => {
                    const name = room.name ?? t('rooms.noRoom')
                    const detail = t('rooms.value', { completed: room.completed, open: room.open })

                    return (
                        <li
                            key={room.roomId ?? 'none'}
                            title={`${name}: ${detail}`}
                            className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3"
                        >
                            <span className="truncate text-sm text-secondary dark:text-slate-300">{name}</span>

                            <span className="flex h-3 w-full gap-0.5">
                                {room.completed > 0 && (
                                    <span
                                        className={`block h-full ${room.open === 0 ? 'rounded-r' : ''}`}
                                        style={{ width: `${(room.completed / max) * 100}%`, backgroundColor: COMPLETED_COLOR }}
                                    />
                                )}
                                {room.open > 0 && (
                                    <span
                                        className="block h-full rounded-r"
                                        style={{ width: `${(room.open / max) * 100}%`, backgroundColor: OPEN_COLOR }}
                                    />
                                )}
                            </span>

                            <span className="text-right text-sm font-semibold tabular-nums text-primary dark:text-slate-100">
                                {room.total}
                            </span>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
