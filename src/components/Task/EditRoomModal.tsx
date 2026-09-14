import { useState } from 'react';
import { useUpdateRoomMutation } from '../../store/apis/taskApi';
import type { Room } from '../../types/Task/Task';

interface EditRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    rooms: Room[];
}

export function EditRoomModal({
    isOpen,
    onClose,
    rooms,
}: EditRoomModalProps) {
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [roomName, setRoomName] = useState('');

    const [updateRoom, { isLoading, isError }] = useUpdateRoomMutation();

    if (!isOpen) {
        return null;
    }

    const handleRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);

        const room = rooms.find((room) => room.id === roomId);
        setRoomName(room?.name ?? '');
    };

    const handleSave = async () => {
        const trimmedName = roomName.trim();

        if (!selectedRoomId || !trimmedName) {
            return;
        }

        try {
            await updateRoom({
                id: selectedRoomId,
                name: trimmedName,
            }).unwrap();

            onClose();
        } catch {
            // Fejlen vises via isError
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Rediger rum
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Vælg et rum og rediger navnet.
                    </p>
                </div>

                <div className="space-y-4">

                    <div>
                        <label
                            htmlFor="edit-room-select"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Vælg rum
                        </label>

                        <select
                            id="edit-room-select"
                            value={selectedRoomId}
                            onChange={(e) => handleRoomChange(e.target.value)}
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

                    <div>
                        <label
                            htmlFor="edit-room-name"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Navn
                        </label>

                        <input
                            id="edit-room-name"
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={!selectedRoomId}
                            placeholder="Indtast rumnavn"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C7975D] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                        />
                    </div>

                    {isError && (
                        <p className="text-sm text-red-600">
                            Kunne ikke redigere rummet. Prøv igen.
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                        Annuller
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={
                            isLoading ||
                            !selectedRoomId ||
                            !roomName.trim()
                        }
                        className="rounded-lg bg-[#C7975D] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? 'Gemmer...' : 'Gem ændringer'}
                    </button>
                </div>
            </div>
        </div>
    );
}