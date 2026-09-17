import { useState } from 'react';
import {
    useDeleteRoomMutation,
    useGetTasksQuery,
} from '../../store/apis/taskApi';
import type { Room } from '../../types/Task/Task';

interface DeleteRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    rooms: Room[];
}

export function DeleteRoomModal({
    isOpen,
    onClose,
    rooms,
}: DeleteRoomModalProps) {
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const [deleteRoom, { isLoading, isError }] =
        useDeleteRoomMutation();

    const { data: tasks = [] } = useGetTasksQuery();

    if (!isOpen) {
        return null;
    }

    const roomTasks = tasks.filter(
        (task) => task.room_id === selectedRoomId
    );

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds((current) =>
            current.includes(taskId)
                ? current.filter((id) => id !== taskId)
                : [...current, taskId]
        );
    };

    const handleRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);
        setSelectedTaskIds([]);
    };

    const handleDelete = async () => {
        if (!selectedRoomId) {
            return;
        }

        try {
            await deleteRoom({
                roomId: selectedRoomId,
                taskIdsToDelete: selectedTaskIds,
            }).unwrap();

            setSelectedRoomId('');
            setSelectedTaskIds([]);
            onClose();
        } catch {
            // Fejlen vises via isError
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-primary dark:text-slate-100">
                            Slet rum
                        </h2>

                        <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                            Vælg det rum, du vil slette.
                        </p>
                    </div>

                    {/* LUK */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        X
                    </button>
                </div>

                <div className="space-y-5">

                    {/* VÆLG RUM */}
                    <div>
                        <label
                            htmlFor="delete-room-select"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            Vælg rum
                        </label>

                        <select
                            id="delete-room-select"
                            value={selectedRoomId}
                            onChange={(e) =>
                                handleRoomChange(e.target.value)
                            }
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">Vælg rum</option>

                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* OPGAVER */}
                    {selectedRoomId && (
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-secondary dark:text-slate-400">
                                        Opgaver i rummet
                                    </p>

                                    <p className="text-xs text-secondary dark:text-slate-400">
                                        Vælg de opgaver, der også skal slettes.
                                    </p>
                                </div>

                                <span className="text-xs font-medium text-secondary dark:text-slate-400">
                                    {selectedTaskIds.length} valgt
                                </span>
                            </div>

                            {roomTasks.length > 0 ? (
                                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-border-gray p-2 dark:border-slate-700">
                                    {roomTasks.map((task) => {
                                        const isSelected =
                                            selectedTaskIds.includes(task.id);

                                        return (
                                            <label
                                                key={task.id}
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                                                    isSelected
                                                        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
                                                        : 'border-border-gray hover:bg-bg-gray dark:border-slate-700 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        toggleTask(task.id)
                                                    }
                                                    className="mt-1 h-4 w-4 rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                                                />

                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-medium text-primary dark:text-slate-100">
                                                        {task.title}
                                                    </p>

                                                    {task.description && (
                                                        <p className="mt-1 break-words text-xs text-secondary dark:text-slate-400">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-bg-gray/40 p-4 dark:bg-slate-900/40">
                                    <p className="text-sm text-secondary dark:text-slate-400">
                                        Der er ingen opgaver i dette rum.
                                    </p>
                                </div>
                            )}

                            {/* INFO */}
                            {roomTasks.length > 0 && (
                                <p className="mt-3 text-xs text-secondary dark:text-slate-400">
                                    Opgaver, du ikke vælger, bliver ikke slettet.
                                    De bliver i stedet flyttet til{' '}
                                    <strong>Uden rum</strong>.
                                </p>
                            )}
                        </div>
                    )}

                    {/* FEJL */}
                    {isError && (
                        <p className="text-sm text-red-700 dark:text-red-400">
                            Kunne ikke slette rummet. Prøv igen.
                        </p>
                    )}
                </div>

                {/* HANDLINGER */}
                <div className="mt-6 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isLoading || !selectedRoomId}
                        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? 'Sletter...' : 'Slet rum'}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    >
                        Luk
                    </button>
                </div>
            </div>
        </div>
    );
}