import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
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


export function EditTaskModal({
    isOpen,
    onClose,
    task,
    canUpdate,
    canDelete,
}: EditTaskModalProps) {
  const { t } = useTranslation(['tasks', 'common'])
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
                t('edit.endBeforeStart')
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
            <div className="w-full max-w-lg rounded-xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700">

                {/* HEADER */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-primary dark:text-slate-100">
                        {t('edit.heading')}
                    </h2>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        <X />
                    </button>
                </div>

                {/* API ERROR */}
                {errorMessage && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                        {errorMessage}
                    </div>
                )}

                <div className="space-y-4">

                    {/* TITEL */}
                    <div>
                        <label
                            htmlFor="edit-task-title"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('common:title')}
                        </label>

                        <input
                            id="edit-task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* BESKRIVELSE */}
                    <div>
                        <label
                            htmlFor="edit-task-description"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('common:description')}
                        </label>

                        <textarea
                            id="edit-task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full resize-y break-words rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* DATE ERROR */}
                    {dateError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                            {dateError}
                        </div>
                    )}

                    {/* DATOER */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* STARTDATO */}
                        <div>
                            <label
                                htmlFor="edit-task-start-date"
                                className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                            >
                                {t('fields.startDate')}
                            </label>

                            <input
                                id="edit-task-start-date"
                                type="date"
                                value={startDate}
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-border-gray bg-bg-gray px-3 py-2 text-secondary outline-none dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400"
                            />
                        </div>

                        {/* SLUTDATO */}
                        <div>
                            <label
                                htmlFor="edit-task-end-date"
                                className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                            >
                                {t('fields.endDate')}
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
                                className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* PRIORITET */}
                    <div>
                        <label
                            htmlFor="edit-task-priority"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('fields.priority')}
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
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">{t('priorityNone')}</option>
                            <option value="Low">{t('priority.Low')}</option>
                            <option value="Medium">{t('priority.Medium')}</option>
                            <option value="High">{t('priority.High')}</option>
                            <option value="Critical">{t('priority.Critical')}</option>
                        </select>
                    </div>

                    {/* ANTAL PERSONER */}
                    <div>
                        <label
                            htmlFor="edit-task-max-assignees"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('fields.maxAssignees')}
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
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">
                                {t('assignees.noLimit')}
                            </option>
                            <option value="1">{t('assignees.count', { count: 1 })}</option>
                            <option value="2">{t('assignees.count', { count: 2 })}</option>
                            <option value="3">{t('assignees.count', { count: 3 })}</option>
                            <option value="4">{t('assignees.count', { count: 4 })}</option>
                            <option value="5">{t('assignees.count', { count: 5 })}</option>
                            <option value="10">{t('assignees.count', { count: 10 })}</option>
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
                            {isLoading ? t('common:saving') : t('common:save')}
                        </button>
                    </div>

                    {canDelete && !isConfirmingDelete && (
                        <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                            {t('edit.deleteTask')}
                        </button>
                    )}
                </div>

                {/* SLET-BEKRÆFTELSE */}
                {isConfirmingDelete && (
                    <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:bg-red-900/30 dark:border-red-800">
                        <p className="mb-3 text-sm text-red-700 dark:text-red-400">
                            {t('edit.confirmDelete', { name: task.title })}
                        </p>

                        {deleteErrorMessage && (
                            <p className="mb-2 text-sm text-red-700 dark:text-red-400">{deleteErrorMessage}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                            >
                                {isDeleting ? t('common:deleting') : t('common:confirmDeleteYes')}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(false)}
                                disabled={isDeleting}
                                className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-border-gray transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                            >
                                {t('common:cancel')}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}