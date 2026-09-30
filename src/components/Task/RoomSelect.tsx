// src/components/Task/RoomSelect.tsx
import { useTranslation } from 'react-i18next'
import { useTaskRoomFavorites } from '../../store/hooks/useTaskRoomFavorites'
import { splitFavoriteRooms } from '../../utils/splitFavoriteRooms'
import type { RoomSelectProps } from '../../types/Task/Task'
import { TASK_INPUT } from './taskFormStyles'

// Vælg et rum - favoritrum først og markeret med ★ (samme rækkefølge som
// RoomBar). Delt af opret opgave og rediger/slet rum.
export function RoomSelect({ id, rooms, value, onChange, className = TASK_INPUT, disabled }: RoomSelectProps) {
    const { t } = useTranslation('tasks')
    const { favoriteIds } = useTaskRoomFavorites(true)
    const { favoriteRooms, otherRooms } = splitFavoriteRooms(rooms, favoriteIds)

    return (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={className}>
            <option value="">{t('rooms.choose')}</option>
            {favoriteRooms.map((room) => (
                <option key={room.id} value={room.id}>★ {room.name}</option>
            ))}
            {otherRooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
            ))}
        </select>
    )
}
