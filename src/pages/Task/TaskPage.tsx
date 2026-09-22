import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskCard } from '../../components/Task/TaskCard';
import { RoomBar } from '../../components/Task/RoomBar';
import { FilterBar } from '../../components/Task/FilterBar.tsx';
import {
    FilterPanel,
    type TaskSortOption,
} from '../../components/Task/FilterPanel.tsx';
import type {
    ETaskPriority,
    ETaskStatus,
} from '../../types/Task/Task';
import { CreateTaskModal } from '../../components/Task/CreateTaskModal';
import {
    useCreateRoomMutation,
    useGetRoomsQuery,
    useGetTasksQuery,
    useGetMyTaskIdsQuery,
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

    const [search, setSearch] = useState('');
    const [selectedRoomId, setSelectedRoomId] =
        useState<string | null>(null);

    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [selectedStatuses, setSelectedStatuses] =
        useState<ETaskStatus[]>([
            'Started',
            'InProgress',
        ]);

    const [selectedPriority, setSelectedPriority] =
        useState<ETaskPriority | 'All'>('All');

    const [sortBy, setSortBy] =
        useState<TaskSortOption>('priority');

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

    const { data: myTaskIds = [] } = useGetMyTaskIdsQuery();



    const handleAddRoom = async () => {
        const roomName = newRoomName.trim();

        if (!roomName) {
            return;
        }

        try {
            await createRoom({ name: roomName }).unwrap();

            setNewRoomName('');
            setIsAddRoomOpen(false);
        } catch {
            // handled through mutation error state
        }
    };

    const filteredTasks = tasks.filter((task) => {
        const searchTerm = search.trim().toLowerCase();

        const taskRoom = rooms.find(
            (room) => room.id === task.room_id
        );

        const isMineSearch =
            searchTerm === 'dig' ||
            searchTerm === 'mine';

        const matchesSearch =
            searchTerm === '' ||
            task.title?.toLowerCase().includes(searchTerm) ||
            task.description?.toLowerCase().includes(searchTerm) ||
            taskRoom?.name.toLowerCase().includes(searchTerm) ||
            (isMineSearch && myTaskIds.includes(task.id));

        const matchesRoom =
            selectedRoomId === null ||
            task.room_id === selectedRoomId;

        const matchesStatus =
            selectedStatuses.includes(task.status);

        const matchesPriority =
            selectedPriority === 'All' ||
            task.priority === selectedPriority;

        const matchesOpenTask =
            task.id === openTaskId;

        return (
            (matchesSearch &&
                matchesRoom &&
                matchesStatus &&
                matchesPriority) ||
            matchesOpenTask
        );
    });

    const priorityRank: Record<string, number> = {
        Critical: 1,
        High: 2,
        Medium: 3,
        Low: 4,
    };

    const sortTasks = (
        a: typeof filteredTasks[number],
        b: typeof filteredTasks[number]
    ) => {
        if (sortBy === 'priority') {
            const priorityA =
                priorityRank[a.priority ?? ''] ?? 5;
            const priorityB =
                priorityRank[b.priority ?? ''] ?? 5;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            if (a.end_date && b.end_date) {
                return a.end_date.localeCompare(b.end_date);
            }
            if (a.end_date) return -1;
            if (b.end_date) return 1;
            return 0;
        }
        if (sortBy === 'deadline') {
            if (a.end_date && b.end_date) {
                return a.end_date.localeCompare(b.end_date);
            }

            if (a.end_date) return -1;
            if (b.end_date) return 1;

            return 0;
        }
        if (sortBy === 'newest') {
            return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );
        }
        if (sortBy === 'oldest') {
            return (
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
        }
        return 0;
    };

    const availableTasks = filteredTasks
        .filter((task) => task.status === 'Started')
        .sort(sortTasks);

    const myTasks = filteredTasks
        .filter((task) => task.status === 'InProgress')
        .sort(sortTasks);

    const pageError =
        readableError(tasksError) ??
        readableError(roomsError) ??
        readableError(createRoomError);

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
                onReset={() => {
                    setSelectedStatuses([
                        'Started',
                        'InProgress',
                    ]);
                    setSelectedPriority('All');
                    setSortBy('priority');
                }}
            />

            {/* CREATE ROOM */}
            {isAddRoomOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
                    onClick={() => {
                        setIsAddRoomOpen(false);
                        setNewRoomName('');
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

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddRoomOpen(false);
                                    setNewRoomName('');
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
                        <h1 className="text-3xl font-bold text-primary dark:text-slate-100">{t('page.heading')}</h1>

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
                <div className="grid grid-cols-2 gap-8 items-start">

                    {/* OPGAVER TILGÆNGELIGE */}
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
                                <p className="text-secondary text-sm py-8 text-center dark:text-slate-400">
                                    {t('page.noAvailableTasks')}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* MINE OPGAVER / I GANG */}
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
                                <p className="text-secondary text-sm py-8 text-center dark:text-slate-400">
                                    {t('page.noTasksInProgress')}
                                </p>
                            )}
                        </div>
                    </section>

                </div>
            </main>

            {/* CREATE TASK */}
            <CreateTaskModal
                isOpen={isCreateTaskOpen}
                onClose={() =>
                    setIsCreateTaskOpen(false)
                }
                selectedRoomId={selectedRoomId}
            />

        </div>
    );
}