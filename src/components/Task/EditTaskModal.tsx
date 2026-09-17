import { useState } from 'react';
import {
    useDeleteTaskMutation,
    useUpdateTaskMutation,
} from '../../store/apis/taskApi';
import type { ETaskPriority, Task } from '../../types/Task/Task';
import { X } from 'lucide-react';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task;
    canUpdate: boolean;
    canDelete: boolean;
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
    canUpdate,
    canDelete,
}: EditTaskModalProps) {
    const today = new Date().toISOString().split('T')[0];

    const [dateError, setDateError] = useState<string | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
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
    const [deleteTask, { isLoading: isDeleting, error: deleteError }] = useDeleteTaskMutation();

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
        setIsConfirmingDelete(false);

        onClose();
    };

    const handleDelete = async () => {
        try {
            await deleteTask(task.id).unwrap();
            onClose();
        } catch {
            // Fejlen vises gennem deleteError
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        setDateError(null);

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
    const deleteErrorMessage = readableError(deleteError);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white border border-border-gray p-6 shadow-xl">

                {/* HEADER */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-primary">
                        Rediger Opgave
                    </h2>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-secondary hover:text-primary"
                    >
                        <X />
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
                            className="mb-1 block text-sm font-medium text-secondary"
                        >
                            Titel
                        </label>

                        <input
                            id="edit-task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                        />
                    </div>

                    {/* BESKRIVELSE */}
                    <div>
                        <label
                            htmlFor="edit-task-description"
                            className="mb-1 block text-sm font-medium text-secondary"
                        >
                            Beskrivelse
                        </label>

                        <textarea
                            id="edit-task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full resize-y break-words rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
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
                                className="mb-1 block text-sm font-medium text-secondary"
                            >
                                Startdato
                            </label>

                            <input
                                id="edit-task-start-date"
                                type="date"
                                value={startDate}
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-border-gray bg-bg-gray px-3 py-2 text-secondary outline-none"
                            />
                        </div>

                        {/* SLUTDATO */}
                        <div>
                            <label
                                htmlFor="edit-task-end-date"
                                className="mb-1 block text-sm font-medium text-secondary"
                            >
                                Slutdato
                            </label>

                            <input
                                id="edit-task-end-date"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDateError(null);
                                }}
                                className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
                            />
                        </div>
                    </div>

                    {/* PRIORITET */}
                    <div>
                        <label
                            htmlFor="edit-task-priority"
                            className="mb-1 block text-sm font-medium text-secondary"
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
                            htmlFor="edit-task-max-assignees"
                            className="mb-1 block text-sm font-medium text-secondary"
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
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent"
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
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading || !title.trim() || !canUpdate}
                            className="rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
                        >
                            {isLoading ? 'Gemmer...' : 'Gem ændringer'}
                        </button>
                    </div>

                    {canDelete && !isConfirmingDelete && (
                        <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                            Slet opgave
                        </button>
                    )}
                </div>

                {/* SLET-BEKRÆFTELSE */}
                {isConfirmingDelete && (
                    <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                        <p className="mb-3 text-sm text-red-700">
                            Er du sikker på at du vil slette "{task.title}"? Dette kan ikke fortrydes.
                        </p>

                        {deleteErrorMessage && (
                            <p className="mb-2 text-sm text-red-700">{deleteErrorMessage}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                                {isDeleting ? 'Sletter...' : 'Ja, slet'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(false)}
                                disabled={isDeleting}
                                className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-border-gray transition-colors disabled:opacity-60"
                            >
                                Annuller
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}