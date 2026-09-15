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
                className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Slet rum
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Vælg det rum, du vil slette.
                        </p>
                    </div>

                    {/* LUK */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        X
                    </button>
                </div>

                <div className="space-y-5">

                    {/* VÆLG RUM */}
                    <div>
                        <label
                            htmlFor="delete-room-select"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Vælg rum
                        </label>

                        <select
                            id="delete-room-select"
                            value={selectedRoomId}
                            onChange={(e) =>
                                handleRoomChange(e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C7975D] focus:outline-none"
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
                                    <p className="text-sm font-medium text-gray-700">
                                        Opgaver i rummet
                                    </p>

                                    <p className="text-xs text-gray-500">
                                        Vælg de opgaver, der også skal slettes.
                                    </p>
                                </div>

                                <span className="text-xs font-medium text-gray-500">
                                    {selectedTaskIds.length} valgt
                                </span>
                            </div>

                            {roomTasks.length > 0 ? (
                                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
                                    {roomTasks.map((task) => {
                                        const isSelected =
                                            selectedTaskIds.includes(task.id);

                                        return (
                                            <label
                                                key={task.id}
                                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                                                    isSelected
                                                        ? 'border-red-300 bg-red-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        toggleTask(task.id)
                                                    }
                                                    className="mt-1 h-4 w-4"
                                                />

                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-medium text-gray-800">
                                                        {task.title}
                                                    </p>

                                                    {task.description && (
                                                        <p className="mt-1 break-words text-xs text-gray-500">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-sm text-gray-500">
                                        Der er ingen opgaver i dette rum.
                                    </p>
                                </div>
                            )}

                            {/* INFO */}
                            {roomTasks.length > 0 && (
                                <p className="mt-3 text-xs text-gray-500">
                                    Opgaver, du ikke vælger, bliver ikke slettet.
                                    De bliver i stedet flyttet til{' '}
                                    <strong>Uden rum</strong>.
                                </p>
                            )}
                        </div>
                    )}

                    {/* FEJL */}
                    {isError && (
                        <p className="text-sm text-red-600">
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
                        className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                    >
                        Luk
                    </button>
                </div>
            </div>
        </div>
    );
}