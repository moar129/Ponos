import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom';
import { readableError } from '../../ErrorMessage';
import { TaskCard } from '../../components/Task/TaskCard';
import { RoomBar } from '../../components/Task/RoomBar';
import { FilterBar } from '../../components/Task/FilterBar.tsx';
import { FilterPanel } from '../../components/Task/FilterPanel.tsx';
import { TaskColumnEmptyState } from '../../components/Task/TaskColumnEmptyState';
import { CreateTaskModal } from '../../components/Task/CreateTaskModal';
import { CreateRoomModal } from '../../components/Task/CreateRoomModal';
import { useTaskFilters } from '../../store/hooks/useTaskFilters';
import { compareTasks, matchesTaskSearch } from '../../utils/taskFilters';
import {
    useGetRoomsQuery,
    useGetTasksQuery,
    useGetMyTaskIdsQuery,
    useGetOpenTaskAssigneeNamesQuery,
} from '../../store/apis/taskApi';
import {
    READ_TASKS_PRIVILEGE,
    ASSIGN_TASKS_PRIVILEGE,
    UPDATE_TASKS_PRIVILEGE,
    DELETE_TASKS_PRIVILEGE,
    CREATE_TASKS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi';

export function MyTasksPage() {
    const { t } = useTranslation(['tasks', 'common'])
    const [searchParams, setSearchParams] = useSearchParams();

    const openTaskId =
        searchParams.get('task') ?? searchParams.get('taskId');

    const closeOpenTask = () =>
        setSearchParams({}, { replace: true });

    const [selectedRoomId, setSelectedRoomId] =
        useState<string | null>(null);

    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const {
        search,
        setSearch,
        searchTerm,
        selectedStatuses,
        setSelectedStatuses,
        selectedPriority,
        setSelectedPriority,
        sortBy,
        setSortBy,
        activeFilterCount,
        resetFilters,
    } = useTaskFilters();

    const {
        hasPrivilege: canRead,
        isLoading: loadingReadPrivilege,
    } = useHasPrivilege(READ_TASKS_PRIVILEGE);

    const { hasPrivilege: canCreate } =
        useHasPrivilege(CREATE_TASKS_PRIVILEGE);

    const { hasPrivilege: canUpdate } =
        useHasPrivilege(UPDATE_TASKS_PRIVILEGE);

    const { hasPrivilege: canAssign } =
        useHasPrivilege(ASSIGN_TASKS_PRIVILEGE);

    const { hasPrivilege: canDelete } =
        useHasPrivilege(DELETE_TASKS_PRIVILEGE);

    const {
        data: tasks = [],
        isLoading: tasksLoading,
        error: tasksError,
    } = useGetTasksQuery();

    const {
        data: rooms = [],
        isLoading: roomsLoading,
        error: roomsError,
    } = useGetRoomsQuery();

    const { data: myTaskIds = [] } =
        useGetMyTaskIdsQuery();

    // Tilmeldtes navne til søgning. Fejler hentningen, søges bare uden navne.
    const { data: assigneeNamesByTask = {} } = useGetOpenTaskAssigneeNamesQuery();

    const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));

    // Den åbne opgave (?task=/?taskId=) vises altid, uanset filtre.
    const filteredTasks = tasks.filter((task) => {
        const matchesSearch = matchesTaskSearch(
            task,
            task.room_id ? roomNameById.get(task.room_id) : undefined,
            assigneeNamesByTask[task.id],
            searchTerm
        );

        const matchesRoom =
            selectedRoomId === null ||
            task.room_id === selectedRoomId;

        const matchesStatus =
            selectedStatuses.some((status) => status === task.status);

        const matchesPriority =
            selectedPriority === 'All' ||
            task.priority === selectedPriority;

        const matchesMine =
            myTaskIds.includes(task.id);

        return (
            (matchesSearch &&
                matchesRoom &&
                matchesStatus &&
                matchesPriority &&
                matchesMine) ||
            task.id === openTaskId
        );
    });

    const sortTasks = compareTasks(sortBy);

    const myAvailableTasks = filteredTasks
        .filter((task) => task.status === 'Started')
        .sort(sortTasks);

    const myInProgressTasks = filteredTasks
        .filter((task) => task.status === 'InProgress')
        .sort(sortTasks);

    // Fravalgt status skjuler kolonnen - medmindre den åbne opgave ligger der.
    const showAvailable =
        selectedStatuses.includes('Started') || myAvailableTasks.length > 0;
    const showInProgress =
        selectedStatuses.includes('InProgress') || myInProgressTasks.length > 0;

    const pageError =
        readableError(tasksError) ??
        readableError(roomsError);

    if (
        tasksLoading ||
        roomsLoading ||
        loadingReadPrivilege
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="font-semibold">
                    {t('mine.loading')}
                </p>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="text-secondary dark:text-slate-400">
                    {t('mine.noAccess')}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white text-primary dark:bg-slate-900 dark:text-slate-100">

            {/* ROOM BAR */}
            <RoomBar
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                onAddRoom={() => setIsAddRoomOpen(true)}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                canFavorite={canRead}
            />

            {/* FILTER BAR */}
            <FilterBar
                isFilterOpen={isFilterOpen}
                onToggleFilter={() =>
                    setIsFilterOpen(!isFilterOpen)
                }
                search={search}
                onSearchChange={setSearch}
                availableCount={myAvailableTasks.length}
                inProgressCount={myInProgressTasks.length}
                activeFilterCount={activeFilterCount}
            />

            {/* FILTER PANEL */}
            <FilterPanel
                isOpen={isFilterOpen}
                selectedStatuses={selectedStatuses}
                selectedPriority={selectedPriority}
                sortBy={sortBy}
                onStatusChange={setSelectedStatuses}
                onPriorityChange={setSelectedPriority}
                onSortChange={setSortBy}
                onReset={resetFilters}
            />

            {/* CREATE ROOM */}
            {isAddRoomOpen && (
                <CreateRoomModal onClose={() => setIsAddRoomOpen(false)} />
            )}

            {/* MAIN */}
            <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-10">

                {pageError && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                        {pageError}
                    </div>
                )}

                {/* PAGE INTRO */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary dark:text-slate-100">
                            {t('mine.heading')}
                        </h1>

                        <p className="text-secondary mt-1 dark:text-slate-400">
                            {t('mine.subtitle')}
                        </p>
                    </div>

                    {canCreate && (
                        <button
                            type="button"
                            onClick={() =>
                                setIsCreateTaskOpen(true)
                            }
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                        >
                            {t('page.createTask')}
                        </button>
                    )}
                </div>

                {/* TASK COLUMNS */}
                <div className={`grid ${showAvailable && showInProgress ? 'grid-cols-2' : 'grid-cols-1'} gap-8 items-start`}>

                    {/* MINE TILGÆNGELIGE OPGAVER */}
                    {showAvailable && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="font-bold text-lg text-primary dark:text-slate-100">
                                    {t('mine.availableHeading')}
                                </h2>

                                <p className="text-sm text-secondary mt-1 dark:text-slate-400">
                                    {t('mine.availableSubtitle')}
                                </p>
                            </div>

                            <span className="bg-bg-gray text-secondary text-xs font-bold px-2.5 py-1 rounded-full dark:bg-slate-700 dark:text-slate-400">
                                {myAvailableTasks.length}
                            </span>
                        </div>

                        <div className="bg-bg-gray/40 border border-border-gray rounded-2xl p-4 min-h-[500px] space-y-4 dark:bg-slate-800/40 dark:border-slate-700">

                            {myAvailableTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    canUpdate={canUpdate}
                                    canDelete={canDelete}
                                    canAssign={canAssign}
                                    defaultDetailsOpen={
                                        task.id === openTaskId
                                    }
                                    onDetailsClose={
                                        closeOpenTask
                                    }
                                />
                            ))}

                            {myAvailableTasks.length === 0 && (
                                <TaskColumnEmptyState
                                    emptyText={t('mine.noAvailableTasks')}
                                    hasActiveFilters={activeFilterCount > 0}
                                    onReset={resetFilters}
                                />
                            )}

                        </div>
                    </section>
                    )}

                    {/* MINE OPGAVER I GANG */}
                    {showInProgress && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="font-bold text-lg text-primary dark:text-slate-100">
                                    {t('mine.inProgressHeading')}
                                </h2>

                                <p className="text-sm text-secondary mt-1 dark:text-slate-400">
                                    {t('mine.inProgressSubtitle')}
                                </p>
                            </div>

                            <span className="bg-bg-gray text-secondary text-xs font-bold px-2.5 py-1 rounded-full dark:bg-slate-700 dark:text-slate-400">
                                {myInProgressTasks.length}
                            </span>
                        </div>

                        <div className="bg-bg-gray/40 border border-border-gray rounded-2xl p-4 min-h-[500px] space-y-4 dark:bg-slate-800/40 dark:border-slate-700">

                            {myInProgressTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    canUpdate={canUpdate}
                                    canDelete={canDelete}
                                    canAssign={canAssign}
                                    defaultDetailsOpen={
                                        task.id === openTaskId
                                    }
                                    onDetailsClose={
                                        closeOpenTask
                                    }
                                />
                            ))}

                            {myInProgressTasks.length === 0 && (
                                <TaskColumnEmptyState
                                    emptyText={t('mine.noTasksInProgress')}
                                    hasActiveFilters={activeFilterCount > 0}
                                    onReset={resetFilters}
                                />
                            )}

                        </div>
                    </section>
                    )}

                </div>

            </main>

            {/* CREATE TASK - mountes kun når åben, så formularen altid
                starter med det aktuelt valgte rum. */}
            {isCreateTaskOpen && (
                <CreateTaskModal
                    onClose={() =>
                        setIsCreateTaskOpen(false)
                    }
                    selectedRoomId={selectedRoomId}
                />
            )}

        </div>
    );
}