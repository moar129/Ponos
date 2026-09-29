import { useTranslation } from 'react-i18next'
import type { StatisticsRoomFilterProps } from '../../types/statistics/statisticsComponentTypes'

// US-55: limit all task figures to one room. Stock and categories stay
// organisation-wide (the page says so on those cards).
export function StatisticsRoomFilter({ rooms, roomId, onChange }: StatisticsRoomFilterProps) {
    const { t } = useTranslation('statistics')

    return (
        <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="statistics-room-filter" className="text-sm font-medium text-primary dark:text-slate-200">
                {t('filter.room')}
            </label>
            <select
                id="statistics-room-filter"
                value={roomId ?? ''}
                onChange={(event) => onChange(event.target.value || null)}
                className="min-w-[12rem] rounded-md border border-border-gray bg-white px-3 py-1.5 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
                <option value="">{t('filter.allRooms')}</option>
                {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                        {room.name}
                    </option>
                ))}
            </select>
        </div>
    )
}
