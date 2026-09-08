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
    const availableTasks = filteredTasks.filter(
        (task) =>
            task.status === 'Started' &&
            !myTaskIds.includes(task.id)
    );
    const myTasks = filteredTasks.filter(
        (task) => myTaskIds.includes(task.id)
    );
    const pageError =
        readableError(tasksError) ??
        readableError(roomsError) ??
        readableError(createRoomError);

    if (tasksLoading || roomsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="font-semibold">Henter opgaver...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f4f4f2] text-[#111827]">
            <header className="border-b border-gray-200 bg-white text-gray-900 px-8 py-5">
                <div className="relative max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8" />
                    <div className="flex items-center gap-5">
                        <div className="relative" />
                    </div>
                </div>
            </header>

            <div className="border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm">
                <RoomBar
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={setSelectedRoomId}
                    onAddRoom={() => setIsAddRoomOpen(true)}
                />
            </div>

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
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Opret rum</h3>

                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Skriv navn på rum"
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
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
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
                            >
                                Annullér
                            </button>

                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                            >
                                Gem rum
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-10">
                {pageError && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {pageError}
                    </div>
                )}

                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Opgaver</h1>

                        <p className="text-gray-500 mt-1">
                            Få overblik over arbejdet, der skal udføres.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateTaskOpen(true)}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                        Opret opgave
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-8 items-start">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg">Opgaver tilgængelige</h2>
                            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                {availableTasks.length}
                            </span>
                        </div>

                        <div className="bg-gray-200/60 rounded-2xl p-4 min-h-[500px] space-y-4">
                            {availableTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                />
                            ))}
                            {availableTasks.length === 0 && (
                                <p className="text-gray-500 text-sm py-8 text-center">
                                    Ingen tilgængelige opgaver
                                </p>
                            )}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg">I gang</h2>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                {myTasks.length}
                            </span>
                        </div>

                        <div className="bg-gray-200/60 rounded-2xl p-4 min-h-[500px] space-y-4">
                            {myTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                />
                            ))}
                            {myTasks.length === 0 && (
                                <p className="text-gray-500 text-sm py-8 text-center">
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
