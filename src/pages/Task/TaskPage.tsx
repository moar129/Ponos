import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchTasks,
    fetchRooms,
    updateTaskStatus,
    createRoom,
    fetchUserOrganisation,
} from '../../store/slices/taskSlices';
import { TaskCard } from '../../components/Task/TaskCard';
import { RoomBar } from '../../components/Task/RoomBar';
import { FilterBar } from '../../components/Task/FilterBar.tsx';
import { FilterPanel } from '../../components/Task/FilterPanel.tsx';
import type { ETaskStatus } from '../../types/Task/Task';

export const TasksPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();

    const { tasks, rooms, userOrgId, loading, error } = useSelector(
        (state: RootState) => state.task
    );
    console.log('USER ORG ID:', userOrgId);
    console.log('TASK ERROR:', error);

    const [search, setSearch] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<ETaskStatus[]>(['Started', 'InProgress']);

    // Hent organisationen for den nuværende bruger
    useEffect(() => {
        dispatch(fetchUserOrganisation());
    }, [dispatch]);

    // Når organisationen er fundet, hent tasks og rooms
    useEffect(() => {
        if (userOrgId) {
            dispatch(fetchTasks(userOrgId));
            dispatch(fetchRooms(userOrgId));
        }
    }, [userOrgId, dispatch]);

    const handleJoinTask = (taskId: string) => {
        dispatch(
            updateTaskStatus({
                id: taskId,
                status: 'InProgress',
            })
        );
    };

    const handleAddRoom = async () => {
        const roomName = newRoomName.trim();

        if (!roomName) {
            return;
        }

        if (!userOrgId) {
            console.error('Ingen organisation fundet');
            return;
        }

        try {
            await dispatch(
                createRoom({
                    organisationId: userOrgId,
                    name: roomName,
                })
            ).unwrap();

            console.log('Rum blev oprettet!');

            setNewRoomName('');
            setIsAddRoomOpen(false);
        } catch (error) {
            console.error('Kunne ikke oprette rum:', error);
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

    const availableTasks = filteredTasks.filter((task) => task.status === 'Started');
    const inProgressTasks = filteredTasks.filter((task) => task.status === 'InProgress');
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
                <p className="font-semibold">Henter opgaver...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f4f4f2] text-[#111827]">
            <header className="border-b border-gray-200 bg-white text-gray-900 px-8 py-5">
                <div className="relative max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="relative">
                        </div>
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

            {/* Filter Bar - toggle */}
            <FilterBar
                isFilterOpen={isFilterOpen}
                onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
                search={search}
                onSearchChange={setSearch}
                availableCount={availableTasks.length}
                inProgressCount={inProgressTasks.length}
            />

            {/* Filter Panel - dropdown */}
            <FilterPanel 
                isOpen={isFilterOpen}
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
            />

            {isAddRoomOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Opret rum
                        </h3>

                        <input
                            type="text"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Skriv navn på rum"
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
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
                                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                            >
                                Gem rum
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">
                        Opgaver
                    </h1>

                    <p className="text-gray-500 mt-1">
                        Få overblik over arbejdet, der skal udføres.
                    </p>
                </div>

                {/* 2 kolonner - Tilgængelige og I gang */}
                <div className="grid grid-cols-2 gap-8 items-start">
                    {/* Tilgængelige opgaver */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg">
                                Opgaver tilgængelige
                            </h2>

                            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                {availableTasks.length}
                            </span>
                        </div>

                        <div className="bg-gray-200/60 rounded-2xl p-4 min-h-[500px] space-y-4">
                            {availableTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onJoin={() => handleJoinTask(task.id)}
                                />
                            ))}
                            {availableTasks.length === 0 && (
                                <p className="text-gray-500 text-sm py-8 text-center">
                                    Ingen tilgængelige opgaver
                                </p>
                            )}
                        </div>
                    </section>

                    {/* I gang opgaver */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg">
                                I gang
                            </h2>

                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                {inProgressTasks.length}
                            </span>
                        </div>

                        <div className="bg-gray-200/60 rounded-2xl p-4 min-h-[500px] space-y-4">
                            {inProgressTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                />
                            ))}
                            {inProgressTasks.length === 0 && (
                                <p className="text-gray-500 text-sm py-8 text-center">
                                    Ingen opgaver i gang
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};