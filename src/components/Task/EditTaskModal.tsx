import { useState } from 'react';
import { useUpdateTaskMutation } from '../../store/apis/taskApi';
import type { ETaskPriority, Task } from '../../types/Task/Task';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task;
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

export function EditTaskModal({
    isOpen,
    onClose,
    task,
}: EditTaskModalProps) {
    const today = new Date().toISOString().split('T')[0];

    const [dateError, setDateError] = useState<string | null>(null);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');

    const [startDate, setStartDate] = useState(
        task.start_date ? task.start_date.slice(0, 10) : today
    );

    const [endDate, setEndDate] = useState(
        task.end_date ? task.end_date.slice(0, 10) : ''
    );

    const [priority, setPriority] = useState<ETaskPriority | null>(
        task.priority
    );

    const [maxAssignees, setMaxAssignees] = useState<number | null>(
        task.max_assignees
    );

    const [updateTask, { isLoading, error }] = useUpdateTaskMutation();

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        setTitle(task.title);
        setDescription(task.description ?? '');
        setPriority(task.priority);

        setStartDate(
            task.start_date
                ? task.start_date.slice(0, 10)
                : today
        );

        setEndDate(
            task.end_date
                ? task.end_date.slice(0, 10)
                : ''
        );

        setMaxAssignees(task.max_assignees);
        setDateError(null);

        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        setDateError(null);

        /*
         * DATE VALIDATION
         *
         * Date-inputtet gemmer datoen som YYYY-MM-DD.
         * Vi validerer først her, når brugeren trykker "Gem".
         */

        if (startDate) {
            // Datoen skal være komplet
            if (startDate.length !== 10) {
                setDateError('Startdatoen er ikke gyldig.');
                return;
            }

            // År 0000 og tidligere år er ikke tilladt
            const startYear = Number(startDate.slice(0, 4));

            if (
                !Number.isInteger(startYear) ||
                startYear < new Date().getFullYear()
            ) {
                setDateError(
                    'Startdatoen skal være i år eller senere.'
                );
                return;
            }

            // Startdatoen må ikke være før i dag
            if (startDate < today) {
                setDateError(
                    'Startdatoen må ikke være før i dag.'
                );
                return;
            }
        }

        if (endDate) {
            // Datoen skal være komplet
            if (endDate.length !== 10) {
                setDateError('Slutdatoen er ikke gyldig.');
                return;
            }

            // År 0000 og tidligere år er ikke tilladt
            const endYear = Number(endDate.slice(0, 4));

            if (
                !Number.isInteger(endYear) ||
                endYear < new Date().getFullYear()
            ) {
                setDateError(
                    'Slutdatoen skal være i år eller senere.'
                );
                return;
            }

            // Slutdatoen må ikke være før i dag
            if (endDate < today) {
                setDateError(
                    'Slutdatoen må ikke være før i dag.'
                );
                return;
            }
        }

        // Slutdato må ikke være før startdato
        if (startDate && endDate && endDate < startDate) {
            setDateError(
                'Slutdatoen må ikke være før startdatoen.'
            );
            return;
        }

        try {
            await updateTask({
                id: task.id,
                title: title.trim(),
                description: description.trim(),
                start_date: startDate || null,
                end_date: endDate || null,
                priority,
                max_assignees: maxAssignees,
                room_id: task.room_id,
            }).unwrap();

            onClose();
        } catch {
            // Fejlen vises gennem error
        }
    };

    const errorMessage = readableError(error);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">

                {/* HEADER */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Rediger Opgave
                    </h2>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-900"
                    >
                        X
                    </button>
                </div>

                {/* API ERROR */}
                {errorMessage && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="space-y-4">

                    {/* TITEL */}
                    <div>
                        <label
                            htmlFor="edit-task-title"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Titel
                        </label>

                        <input
                            id="edit-task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* BESKRIVELSE */}
                    <div>
                        <label
                            htmlFor="edit-task-description"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Beskrivelse
                        </label>

                        <textarea
                            id="edit-task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full resize-y break-words rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* DATE ERROR */}
                    {dateError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {dateError}
                        </div>
                    )}

                    {/* DATOER */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* STARTDATO */}
                        <div>
                            <label
                                htmlFor="edit-task-start-date"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Startdato
                            </label>

                            <input
                                id="edit-task-start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDateError(null);
                                }}
                                min={today}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* SLUTDATO */}
                        <div>
                            <label
                                htmlFor="edit-task-end-date"
                                className="mb-1 block text-sm font-medium text-gray-700"
                            >
                                Slutdato
                            </label>

                            <input
                                id="edit-task-end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDateError(null);
                                }}
                                min={startDate || today}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* PRIORITET */}
                    <div>
                        <label
                            htmlFor="edit-task-priority"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Prioritet
                        </label>

                        <select
                            id="edit-task-priority"
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

                    {/* ANTAL PERSONER */}
                    <div>
                        <label
                            htmlFor="edit-task-max-assignees"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Antal personer
                        </label>

                        <select
                            id="edit-task-max-assignees"
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
                            <option value="">
                                Ingen begrænsning
                            </option>
                            <option value="1">1 person</option>
                            <option value="2">2 personer</option>
                            <option value="3">3 personer</option>
                            <option value="4">4 personer</option>
                            <option value="5">5 personer</option>
                            <option value="10">10 personer</option>
                        </select>
                    </div>

                </div>

                {/* BUTTONS */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                        Annuller
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading || !title.trim()}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {isLoading
                            ? 'Gemmer...'
                            : 'Gem ændringer'}
                    </button>
                </div>

            </div>
        </div>
    );
}