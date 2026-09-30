// src/components/dashboard/FavoriteRoomsList.tsx
import { readableError } from '../../ErrorMessage';
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Lock } from 'lucide-react'
import { useGetRoomsQuery, useGetTasksQuery } from '../../store/apis/taskApi'
import { useGetTaskRoomFavoritesQuery } from '../../store/apis/taskRoomFavoriteApi'
import { splitFavoriteRooms } from '../../utils/splitFavoriteRooms'
import type { TasksLocationState } from '../../types/Task/Task'
import { isOpenTask } from '../../utils/taskDisplay'

// US-77: brugerens favoritrum (task_room_favorites) som fane i
// MyTasksWidget. Rum brugeren ikke længere har adgang til returneres ikke
// af getRooms og falder derfor automatisk fra. "Åbne" = Started +
// InProgress, afledt af getTasks - aldrig indtastet. Renderes kun med
// read_tasks (gated i MyTasksWidget).
export function FavoriteRoomsList() {
    const { t } = useTranslation('dashboard')
    const navigate = useNavigate()

    const { data: favoriteIds, isLoading: loadingFavorites, error: favoritesError } = useGetTaskRoomFavoritesQuery()
    const { data: rooms = [], isLoading: loadingRooms, error: roomsError } = useGetRoomsQuery()
    const { data: tasks = [], isLoading: loadingTasks, error: tasksError } = useGetTasksQuery()

    const { favoriteRooms } = splitFavoriteRooms(rooms, new Set(favoriteIds))

    const openCount = (roomId: string) =>
        tasks.filter(
            (task) => task.room_id === roomId && isOpenTask(task)
        ).length

    const openRoom = (roomId: string) => {
        const state: TasksLocationState = { roomId }
        navigate('/tasks', { state })
    }

    const error = readableError(favoritesError) ?? readableError(roomsError) ?? readableError(tasksError)

    if (loadingFavorites || loadingRooms || loadingTasks) {
        return <p className="text-sm text-secondary dark:text-slate-400">{t('favoriteRooms.loading')}</p>
    }

    if (error) {
        return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    }

    if (favoriteRooms.length === 0) {
        return (
            <p className="text-sm text-secondary dark:text-slate-400">
                {t('favoriteRooms.empty')}{' '}
                <Link to="/tasks" className="text-accent hover:underline">
                    {t('favoriteRooms.emptyLink')}
                </Link>
            </p>
        )
    }

    return (
        <ul className="divide-y divide-border-gray dark:divide-slate-700">
            {favoriteRooms.map((room) => (
                <li key={room.id}>
                    <button
                        type="button"
                        onClick={() => openRoom(room.id)}
                        className="w-full flex items-center justify-between gap-3 text-left py-2.5 -mx-2 px-2 rounded-md transition-colors hover:bg-bg-gray/50 dark:hover:bg-slate-700/50"
                    >
                        <span className="flex items-center gap-1.5 min-w-0">
                            {room.role_ids.length > 0 && (
                                <Lock size={14} className="shrink-0 text-secondary dark:text-slate-400" aria-hidden="true" />
                            )}
                            <span className="font-medium text-primary truncate dark:text-slate-100">{room.name}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                            <span className="rounded-full bg-bg-gray px-2 py-0.5 text-xs font-medium text-secondary dark:bg-slate-700 dark:text-slate-400">
                                {t('favoriteRooms.openTasks', { count: openCount(room.id) })}
                            </span>
                            <ChevronRight className="w-4 h-4 text-secondary dark:text-slate-400" />
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    )
}
