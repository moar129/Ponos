import { useState } from 'react';
import {
    useCreateTaskMutation,
    useGetRoomsQuery,

} from '../../store/apis/taskApi';
import type { ETaskPriority } from '../../types/Task/Task';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRoomId: string | null;
}

function readableError(err: unknown): string | null {
    if (!err) return null;
    if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') {
        return err.error;
    }
    return 'Noget gik galt. Prøv igen.';
}

export function CreateTaskModal({
    isOpen,
    onClose,
    selectedRoomId,
}: CreateTaskModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const isValidDate = (date: string) => {
        if (!date) return true;

        return date >= today;
    };


    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState('');
    const [priority, setPriority] = useState<ETaskPriority | null>(null);
    const [maxAssignees, setMaxAssignees] = useState<number | null>(null);
    const [roomId, setRoomId] = useState<string | null>(selectedRoomId); const [createTask, { isLoading, error }] = useCreateTaskMutation();
    const { data: rooms = [] } = useGetRoomsQuery();

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        try {
            console.log('Opretter opgave med room_id:', selectedRoomId);

            await createTask({
                title: title.trim(),
                description: description.trim(),
                start_date: startDate || null,
                end_date: endDate || null,
                priority,
                max_assignees: maxAssignees,
                room_id: roomId,
            }).unwrap();

            setTitle('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setPriority(null);
            setMaxAssignees(null);
            onClose();
        } catch {
            // handled through mutation error state
        }
    }

    const errorMessage = readableError(error);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Opret Opgave
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        X
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                        {errorMessage}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="task-title"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Titel
                        </label>
                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Opgavens titel"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="task-description"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Beskrivelse
                        </label>

                        <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Opgavens beskrivelse"
                            rows={5}
                            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 break-words" />
                    </div>

                    {/* RUM */}
                    <div>
                        <label
                            htmlFor="task-room"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Rum
                        </label>

                        <select
                            id="task-room"
                            value={roomId ?? ''}
                            onChange={(e) => setRoomId(e.target.value || null)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        >
                            <option value="">Vælg rum</option>

                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="task-start-date"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Startdato
                            </label>

                            <input
                                id="task-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    if (isValidDate(value)) {
                                        setStartDate(value);
                                    }
                                }}
                                min={startDate || today}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="task-end-date"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Slutdato
                            </label>

                            <input
                                id="task-end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    if (isValidDate(value)) {
                                        setEndDate(value);
                                    }
                                }}
                                min={startDate || today}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="task-priority"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Prioritet
                        </label>
                        <select
                            id="task-priority"
                            value={priority ?? ''}
                            onChange={(e) =>
                                setPriority(
                                    e.target.value === ''
                                        ? null
                                        : (e.target.value as ETaskPriority)
                                )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        >
                            <option value="">Ingen prioritet</option>
                            <option value="Low">Lav</option>
                            <option value="Medium">Medium</option>
                            <option value="High">Høj</option>
                            <option value="Critical">Kritisk</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="task-max-assignees"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Antal personer
                        </label>

                        <select
                            id="task-max-assignees"
                            value={maxAssignees ?? ''}
                            onChange={(e) =>
                                setMaxAssignees(
                                    e.target.value === ''
                                        ? null
                                        : Number(e.target.value)
                                )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        >
                            <option value="">Ingen begrænsning</option>
                            <option value="1">1 person</option>
                            <option value="2">2 personer</option>
                            <option value="3">3 personer</option>
                            <option value="4">4 personer</option>
                            <option value="5">5 personer</option>
                            <option value="10">10 personer</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                        Annuller
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        Opret Opgave
                    </button>
                </div>
            </div>
        </div>
    );
};
