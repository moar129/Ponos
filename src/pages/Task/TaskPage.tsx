import { useState } from 'react';
import { TaskCard } from '../../components/Task/TaskCard';
import { RoomBar } from '../../components/Task/RoomBar';
import { FilterBar } from '../../components/Task/FilterBar.tsx';
import { FilterPanel } from '../../components/Task/FilterPanel.tsx';
import type { ETaskStatus } from '../../types/Task/Task';
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
    UPDATE_TASKS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi';

function readableError(err: unknown): string | null {
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error;
    }
    return 'Noget gik galt. Prøv igen.';
}

export function TasksPage() {
    const [search, setSearch] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<ETaskStatus[]>(['Started', 'InProgress']);
    const [createRoom, { error: createRoomError }] = useCreateRoomMutation();

    const { hasPrivilege: canRead, isLoading: loadingReadPrivilege } = useHasPrivilege(READ_TASKS_PRIVILEGE);
    const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_TASKS_PRIVILEGE);
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_TASKS_PRIVILEGE);
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_TASKS_PRIVILEGE);

    const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useGetTasksQuery();
    const { data: rooms = [], isLoading: roomsLoading, error: roomsError } = useGetRoomsQuery();
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

        const matchesSearch = task.title
            ?.toLowerCase()
            .includes(search.toLowerCase());


        const matchesRoom =
            selectedRoomId === null || task.room_id === selectedRoomId;

        const matchesStatus = selectedStatuses.includes(task.status);

        return matchesSearch && matchesRoom && matchesStatus;
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
        const priorityA = priorityRank[a.priority ?? ''] ?? 5;
        const priorityB = priorityRank[b.priority ?? ''] ?? 5;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        if (a.end_date && b.end_date) {
            return a.end_date.localeCompare(b.end_date);
        }

        if (a.end_date) return -1;
        if (b.end_date) return 1;

        return 0;
    };

    const availableTasks = filteredTasks
        .filter(
            (task) =>
                task.status === 'Started' &&
                !myTaskIds.includes(task.id)
        )
        .sort(sortTasks);

    const myTasks = filteredTasks
        .filter((task) => myTaskIds.includes(task.id))
        .sort(sortTasks);

    const pageError =
        readableError(tasksError) ??
        readableError(roomsError) ??
        readableError(createRoomError);

    if (tasksLoading || roomsLoading || loadingReadPrivilege) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="font-semibold">Henter opgaver...</p>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="text-secondary dark:text-slate-400">Du har ikke adgang til at se opgaver i denne organisation.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
            <RoomBar
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                onAddRoom={() => setIsAddRoomOpen(true)}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
            />

            <FilterBar
                isFilterOpen={isFilterOpen}
                onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
                search={search}
                onSearchChange={setSearch}
                availableCount={availableTasks.length}
                inProgressCount={myTasks.length}
            />

            <FilterPanel
                isOpen={isFilterOpen}
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
            />

            {isAddRoomOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-primary mb-4 dark:text-slate-100">Opret rum</h3>

                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Skriv navn på rum"
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
                                Annullér
                            </button>

                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                            >
                                Gem rum
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-10">
                {pageError && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                        {pageError}
                    </div>
                )}

                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary dark:text-slate-100">Opgaver</h1>

                        <p className="text-secondary mt-1 dark:text-slate-400">
                            Få overblik over arbejdet, der skal udføres.
                        </p>
                    </div>

                    {canCreate && (
                        <button
                            type="button"
                            onClick={() => setIsCreateTaskOpen(true)}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                        >
                            Opret opgave
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-8 items-start">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-primary dark:text-slate-100">Opgaver tilgængelige</h2>
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
                                />
                            ))}
                            {availableTasks.length === 0 && (
                                <p className="text-secondary text-sm py-8 text-center dark:text-slate-400">
                                    Ingen tilgængelige opgaver
                                </p>
                            )}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg text-primary dark:text-slate-100">I gang</h2>
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
                                />
                            ))}
                            {myTasks.length === 0 && (
                                <p className="text-secondary text-sm py-8 text-center dark:text-slate-400">
                                    Ingen opgaver i gang
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <CreateTaskModal
                isOpen={isCreateTaskOpen}
                onClose={() => setIsCreateTaskOpen(false)}
                selectedRoomId={selectedRoomId}
            />
        </div>
    );
}
