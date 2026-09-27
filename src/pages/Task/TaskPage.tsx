import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { TaskCard } from '../../components/Task/TaskCard';
import { RoomBar } from '../../components/Task/RoomBar';
import { FilterBar } from '../../components/Task/FilterBar.tsx';
import { FilterPanel } from '../../components/Task/FilterPanel.tsx';
import { TaskColumnEmptyState } from '../../components/Task/TaskColumnEmptyState';
import type { TasksLocationState } from '../../types/Task/Task';
import { CreateTaskModal } from '../../components/Task/CreateTaskModal';
import { RoomRolePicker } from '../../components/Task/RoomRolePicker';
import { FavoriteStarButton } from '../../components/common/FavoriteStarButton';
import { useTaskRoomFavorites } from '../../store/hooks/useTaskRoomFavorites';
import { useTaskFilters } from '../../store/hooks/useTaskFilters';
import { compareTasks, matchesTaskSearch } from '../../utils/taskFilters';
import {
    useCreateRoomMutation,
    useGetRoomsQuery,
    useGetTasksQuery,
    useGetOpenTaskAssigneeNamesQuery,
} from '../../store/apis/taskApi';
import {
    CREATE_TASKS_PRIVILEGE,
    DELETE_TASKS_PRIVILEGE,
    READ_TASKS_PRIVILEGE,
    ASSIGN_TASKS_PRIVILEGE,
    UPDATE_TASKS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi';


export function TasksPage() {
  const { t } = useTranslation(['tasks', 'common'])
    const [searchParams, setSearchParams] = useSearchParams();

    // ?task= (Mine opgaver-widget, godkend/afvis-notifikationer)
    // ?taskId= (notify_task_*-triggerne)
    // åbner begge opgavens popup.
    const openTaskId =
        searchParams.get('task') ?? searchParams.get('taskId');

    const closeOpenTask = () =>
        setSearchParams({}, { replace: true });

    const location = useLocation();
    const [selectedRoomId, setSelectedRoomId] =
        useState<string | null>(
            () => (location.state as TasksLocationState | null)?.roomId ?? null
        );

    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomRoleIds, setNewRoomRoleIds] = useState<string[]>([]);
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

    const [createRoom, { error: createRoomError }] =
        useCreateRoomMutation();

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

    // Tilmeldtes navne til søgning. Fejler hentningen, søges bare uden navne.
    const { data: assigneeNamesByTask = {} } = useGetOpenTaskAssigneeNamesQuery();

    const {
        favoriteIds,
        toggleFavorite,
        favoriteError,
    } = useTaskRoomFavorites(canRead);

    const selectedRoom = rooms.find(
        (room) => room.id === selectedRoomId
    );



    const handleAddRoom = async () => {
        const roomName = newRoomName.trim();

        if (!roomName) {
            return;
        }

        try {
            await createRoom({ name: roomName, roleIds: newRoomRoleIds }).unwrap();

            setNewRoomName('');
            setNewRoomRoleIds([]);
            setIsAddRoomOpen(false);
        } catch {
            // handled through mutation error state
        }
    };

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

        return (
            (matchesSearch &&
                matchesRoom &&
                matchesStatus &&
                matchesPriority) ||
            task.id === openTaskId
        );
    });

    const sortTasks = compareTasks(sortBy);

    const availableTasks = filteredTasks
        .filter((task) => task.status === 'Started')
        .sort(sortTasks);

    const myTasks = filteredTasks
        .filter((task) => task.status === 'InProgress')
        .sort(sortTasks);

    // Fravalgt status skjuler kolonnen - medmindre den åbne opgave ligger der.
    const showAvailable =
        selectedStatuses.includes('Started') || availableTasks.length > 0;
    const showInProgress =
        selectedStatuses.includes('InProgress') || myTasks.length > 0;

    const pageError =
        readableError(tasksError) ??
        readableError(roomsError) ??
        readableError(createRoomError) ??
        favoriteError;

    if (
        tasksLoading ||
        roomsLoading ||
        loadingReadPrivilege
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="font-semibold">{t('page.loading')}</p>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="text-secondary dark:text-slate-400">{t('page.noAccess')}</p>
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
                availableCount={availableTasks.length}
                inProgressCount={myTasks.length}
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
                    onClick={() => {
                        setIsAddRoomOpen(false);
                        setNewRoomName('');
                        setNewRoomRoleIds([]);
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <h3 className="text-xl font-bold text-primary mb-4 dark:text-slate-100">{t('page.createRoom')}</h3>

                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder={t('page.roomNamePlaceholder')}
                            className="w-full rounded-xl border border-border-gray bg-white text-primary px-3 py-2 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddRoom();
                                }
                            }}
                            autoFocus
                        />

                        <div className="mt-4">
                            <RoomRolePicker
                                selectedRoleIds={newRoomRoleIds}
                                onChange={setNewRoomRoleIds}
                                suggestedRoleName={newRoomName}
                            />
                        </div>

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddRoomOpen(false);
                                    setNewRoomName('');
                                    setNewRoomRoleIds([]);
                                }}
                                className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-gray-300 transition-colors dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                            >
                                {t('common:cancel')}
                            </button>

                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                            >
                                {t('page.saveRoom')}
                            </button>
                        </div>
                    </div>
                </div>
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
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-primary dark:text-slate-100">{selectedRoom
                                ? t('page.roomHeading', { room: selectedRoom.name })
                                : t('page.heading')}</h1>

                            {selectedRoom && canRead && (
                                <FavoriteStarButton
                                    variant="heading"
                                    isFavorite={favoriteIds.has(selectedRoom.id)}
                                    onToggle={() => void toggleFavorite(selectedRoom.id)}
                                />
                            )}
                        </div>

                        <p className="text-secondary mt-1 dark:text-slate-400">
                            {t('page.subtitle')}
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

                    {/* OPGAVER TILGÆNGELIGE */}
                    {showAvailable && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-primary dark:text-slate-100">{t('page.availableHeading')}</h2>
                            <span className="bg-bg-gray text-secondary text-xs font-bold px-2.5 py-1 rounded-full dark:bg-slate-700 dark:text-slate-400">
                                {availableTasks.length}
                            </span>
                        </div>

                        <div className="bg-bg-gray/40 border border-border-gray rounded-2xl p-4 min-h-[500px] space-y-4 dark:bg-slate-800/40 dark:border-slate-700">
                            {availableTasks.map((task) => (
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

                            {availableTasks.length === 0 && (
                                <TaskColumnEmptyState
                                    emptyText={t('page.noAvailableTasks')}
                                    hasActiveFilters={activeFilterCount > 0}
                                    onReset={resetFilters}
                                />
                            )}
                        </div>
                    </section>
                    )}

                    {/* MINE OPGAVER / I GANG */}
                    {showInProgress && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-primary dark:text-slate-100">{t('page.inProgressHeading')}</h2>
                            <span className="bg-bg-gray text-secondary text-xs font-bold px-2.5 py-1 rounded-full dark:bg-slate-700 dark:text-slate-400">
                                {myTasks.length}
                            </span>
                        </div>

                        <div className="bg-bg-gray/40 border border-border-gray rounded-2xl p-4 min-h-[500px] space-y-4 dark:bg-slate-800/40 dark:border-slate-700">
                            {myTasks.map((task) => (
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

                            {myTasks.length === 0 && (
                                <TaskColumnEmptyState
                                    emptyText={t('page.noTasksInProgress')}
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