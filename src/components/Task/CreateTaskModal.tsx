import { useState } from 'react';
import {
    useCreateTaskMutation,
    useGetRoomsQuery,
} from '../../store/apis/taskApi';
import type { ETaskPriority } from '../../types/Task/Task';
import { X } from 'lucide-react';


interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRoomId: string | null;
}

function readableError(err: unknown): string | null {
    if (!err) return null;

    if (
        typeof err === 'object' &&
        err !== null &&
        'error' in err &&
        typeof err.error === 'string'
    ) {
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

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [endDate, setEndDate] = useState('');
    const [priority, setPriority] = useState<ETaskPriority | null>(null);
    const [maxAssignees, setMaxAssignees] = useState<number | null>(null);
    const [roomId, setRoomId] = useState<string | null>(selectedRoomId);

    const [createTask, { isLoading, error }] = useCreateTaskMutation();
    const { data: rooms = [] } = useGetRoomsQuery();

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        try {
            console.log('Opretter opgave med room_id:', roomId);

            await createTask({
                title: title.trim(),
                description: description.trim(),
                start_date: today,
                end_date: endDate || null,
                priority,
                max_assignees: maxAssignees,
                room_id: roomId,
            }).unwrap();

            setTitle('');
            setDescription('');
            setEndDate('');
            setPriority(null);
            setMaxAssignees(null);
            setRoomId(selectedRoomId);

            onClose();
        } catch {
            // handled through mutation error state
        }
    };

    const errorMessage = readableError(error);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white border border-border-gray p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-primary">
                        Opret Opgave
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-secondary hover:text-primary"
                    >
                        <X />
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="space-y-4">
                    {/* TITEL */}
                    <div>
                        <label
                            htmlFor="task-title"
                            className="mb-1 block text-sm font-medium text-secondary"
                        >
                            Titel
                        </label>

                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Opgavens titel"
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                        />
                    </div>

                    {/* BESKRIVELSE */}
                    <div>
                        <label
                            htmlFor="task-description"
                            className="mb-1 block text-sm font-medium text-secondary"
                        >
                            Beskrivelse
                        </label>

                        <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Opgavens beskrivelse"
                            rows={5}
                            className="w-full resize-y break-words rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                        />
                    </div>

                    {/* RUM */}
                    <div>
                        <label
                            htmlFor="task-room"
                            className="mb-1 block text-sm font-medium text-secondary"
                        >
                            Rum
                        </label>

                        <select
                            id="task-room"
                            value={roomId ?? ''}
                            onChange={(e) =>
                                setRoomId(e.target.value || null)
                            }
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                        >
                            <option value="">Vælg rum</option>

                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* DATOER */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* STARTDATO */}
                        <div>
                            <label
                                htmlFor="task-start-date"
                                className="mb-1 block text-sm font-medium text-secondary"
                            >
                                Startdato
                            </label>

                            <input
                                id="task-start-date"
                                type="date"
                                value={today}
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-border-gray bg-bg-gray px-3 py-2 text-secondary outline-none"
                            />
                        </div>

                        {/* SLUTDATO */}
                        <div>
                            <label
                                htmlFor="task-end-date"
                                className="mb-1 block text-sm font-medium text-secondary"
                            >
                                Slutdato
                            </label>

                            <input
                                id="task-end-date"
                                type="date"
                                value={endDate}
                                min={today}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                            />
                        </div>
                    </div>

                    {/* PRIORITET */}
                    <div>
                        <label
                            htmlFor="task-priority"
                            className="mb-1 block text-sm font-medium text-secondary"
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
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                        >
                            <option value="">Ingen prioritet</option>
                            <option value="Low">Lav</option>
                            <option value="Medium">Medium</option>
                            <option value="High">Høj</option>
                            <option value="Critical">Kritisk</option>
                        </select>
                    </div>

                    {/* ANTAL PERSONER */}
                    <div>
                        <label
                            htmlFor="task-max-assignees"
                            className="mb-1 block text-sm font-medium text-secondary"
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
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
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

                {/* KNAPPER */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-secondary hover:bg-bg-gray"
                    >
                        Annuller
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                        Opret Opgave
                    </button>
                </div>
            </div>
        </div>
    );
}