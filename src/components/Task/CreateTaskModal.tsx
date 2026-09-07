import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { createTask } from '../../store/slices/taskSlices';
import type { ETaskPriority } from '../../types/Task/Task';


interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<ETaskPriority | null>(null);
    const [maxAssignees, setMaxAssignees] = useState<number | null>(null);
    const dispatch = useDispatch<AppDispatch>();

    const userOrgId = useSelector(
        (state: RootState) => state.task.userOrgId
    );

    if (!isOpen) {
        return null;
    }
    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        if (!userOrgId) {
            return;
        }

        await dispatch(
            createTask({
                organisationId: userOrgId,
                title: title.trim(),
                description: description.trim(),
                priority,
                max_assignees: maxAssignees,
            })
        );

        setTitle('');
        setDescription('');
        setPriority(null);
        setMaxAssignees(null);
        onClose();
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">

                {/* Modal Header */}
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

                {/* Form */}
                <div className="space-y-4">

                    {/* TITLE */}
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

                    {/* DESCRIPTION */}
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* PRIORITY */}
                    <div>
                        <label htmlFor="task-priority"
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

                    {/* MAX ANTAL PERSONER */}
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

                {/* Buttons */}
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
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        Opret Opgave
                    </button>
                </div>

            </div>
        </div>
    );
};