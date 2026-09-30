// src/store/hooks/useTaskBoard.ts
import { useSearchParams } from 'react-router-dom'
import { readableError } from '../../ErrorMessage'
import {
    useGetMyTaskIdsQuery,
    useGetOpenTaskAssigneeNamesQuery,
    useGetRoomsQuery,
    useGetTasksQuery,
} from '../apis/taskApi'
import { compareTasks, matchesTaskSearch } from '../../utils/taskFilters'
import { useTaskFilters } from './useTaskFilters'

// Data + søg/filter/sortering til opgave-tavlen på /tasks og /tasks/mine.
// onlyMine = kun opgaver brugeren er tilmeldt.
export function useTaskBoard({ onlyMine, selectedRoomId }: { onlyMine: boolean; selectedRoomId: string | null }) {
    const [searchParams, setSearchParams] = useSearchParams()
    // ?task= (Mine opgaver-widget, godkend/afvis-notifikationer) og
    // ?taskId= (notify_task_*-triggerne) åbner begge opgavens popup.
    const openTaskId = searchParams.get('task') ?? searchParams.get('taskId')
    const closeOpenTask = () => setSearchParams({}, { replace: true })

    const filters = useTaskFilters()
    const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useGetTasksQuery()
    const { data: rooms = [], isLoading: roomsLoading, error: roomsError } = useGetRoomsQuery()
    const { data: myTaskIds = [] } = useGetMyTaskIdsQuery(undefined, { skip: !onlyMine })
    // Tilmeldtes navne til søgning. Fejler hentningen, søges bare uden navne.
    const { data: assigneeNamesByTask = {} } = useGetOpenTaskAssigneeNamesQuery()

    const roomNameById = new Map(rooms.map((room) => [room.id, room.name]))

    // Den åbne opgave vises altid, uanset filtre.
    const filteredTasks = tasks.filter((task) =>
        task.id === openTaskId || (
            matchesTaskSearch(task, task.room_id ? roomNameById.get(task.room_id) : undefined, assigneeNamesByTask[task.id], filters.searchTerm) &&
            (selectedRoomId === null || task.room_id === selectedRoomId) &&
            filters.selectedStatuses.some((status) => status === task.status) &&
            (filters.selectedPriority === 'All' || task.priority === filters.selectedPriority) &&
            (!onlyMine || myTaskIds.includes(task.id))
        ),
    )

    const sortTasks = compareTasks(filters.sortBy)

    return {
        ...filters,
        rooms,
        openTaskId,
        closeOpenTask,
        available: filteredTasks.filter((task) => task.status === 'Started').sort(sortTasks),
        inProgress: filteredTasks.filter((task) => task.status === 'InProgress').sort(sortTasks),
        isLoading: tasksLoading || roomsLoading,
        error: readableError(tasksError) ?? readableError(roomsError),
    }
}
