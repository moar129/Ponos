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
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');
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
        setMaxAssignees(task.max_assignees);

        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        try {
            await updateTask({
                id: task.id,
                title: title.trim(),
                description: description.trim(),
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
                
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Rediger Opgave
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
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="space-y-4">

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
                        {isLoading ? 'Gemmer...' : 'Gem ændringer'}
                    </button>
                </div>

            </div>
        </div>
    );
}