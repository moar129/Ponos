import { useTranslation } from 'react-i18next'
import type { RoomScorecardProps } from '../../types/statistics/statisticsComponentTypes'

const CELL_BASE = 'px-3 py-2 text-right tabular-nums'
const CELL = `${CELL_BASE} text-primary dark:text-slate-100`
const HEAD = 'whitespace-nowrap px-3 py-2 text-right font-medium text-secondary dark:text-slate-400'

// The KPI definitions per room, so a row matches what the room filter shows.
// Rooms with overdue tasks first - the question is "where is it slipping?".
export function RoomScorecard({ data, onSelectRoom }: RoomScorecardProps) {
    const { t, i18n } = useTranslation('statistics')
    const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

    const rows = [...data].sort((a, b) =>
        b.overdue - a.overdue
        || b.total - a.total
        || b.completed - a.completed
        || (a.name ?? '').localeCompare(b.name ?? '', i18n.language))

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
                <thead>
                    <tr className="border-b border-border-gray dark:border-slate-700">
                        <th scope="col" className="px-3 py-2 text-left font-medium text-secondary dark:text-slate-400">
                            {t('filter.room')}
                        </th>
                        <th scope="col" className={HEAD}>{t('rooms.created')}</th>
                        <th scope="col" className={HEAD}>{t('rooms.completed')}</th>
                        <th scope="col" className={HEAD}>{t('rooms.overdue')}</th>
                        <th scope="col" className={HEAD}>{t('rooms.onTime')}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((room) => {
                        const name = room.name ?? t('rooms.noRoom')

                        return (
                            <tr key={room.roomId ?? 'none'} className="border-b border-border-gray last:border-0 dark:border-slate-700">
                                <th scope="row" className="max-w-[14rem] px-3 py-2 text-left font-normal">
                                    {room.roomId ? (
                                        <button
                                            type="button"
                                            onClick={() => onSelectRoom(room.roomId as string)}
                                            title={t('rooms.filterTo', { room: name })}
                                            className="block max-w-full truncate text-left text-accent hover:underline"
                                        >
                                            {name}
                                        </button>
                                    ) : (
                                        <span className="block truncate text-secondary dark:text-slate-300">{name}</span>
                                    )}
                                </th>
                                <td className={CELL}>{room.total}</td>
                                <td className={CELL}>{room.completed}</td>
                                <td className={room.overdue > 0 ? `${CELL_BASE} font-semibold text-red-700 dark:text-red-400` : CELL}>
                                    {room.overdue}
                                </td>
                                <td className={CELL}>
                                    {room.onTimeRate === null ? (
                                        <span className="text-secondary dark:text-slate-500">–</span>
                                    ) : (
                                        <>
                                            {number.format(room.onTimeRate)} %
                                            <span className="ml-1 text-xs text-secondary dark:text-slate-400">
                                                ({t('rooms.onTimeValue', { onTime: room.completedOnTime, total: room.completedWithDeadline })})
                                            </span>
                                        </>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
