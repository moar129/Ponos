import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import {
    useCreateTaskMutation,
    useGetRoomsQuery,
} from '../../store/apis/taskApi';
import { useReserveItemUnitsMutation } from '../../store/apis/categoryApi';
import type { ETaskPriority } from '../../types/Task/Task';
import type { AggregatedItem } from '../../types/dataLayer/datalayerTypes';
import { X } from 'lucide-react';
import { TaskItemPicker } from './TaskItemPicker';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRoomId: string | null;
}

interface StagedMaterial {
    key: string;
    item: AggregatedItem;
    quantity: number;
}

export function CreateTaskModal({
    isOpen,
    onClose,
    selectedRoomId,
}: CreateTaskModalProps) {
  const { t } = useTranslation(['tasks', 'common'])
    const today = new Date().toISOString().split('T')[0];

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [endDate, setEndDate] = useState('');
    const [priority, setPriority] = useState<ETaskPriority | null>(null);
    const [maxAssignees, setMaxAssignees] = useState<number | null>(null);
    const [requiresApproval, setRequiresApproval] = useState(true);
    const [roomId, setRoomId] = useState<string | null>(selectedRoomId);
    const [pendingMaterials, setPendingMaterials] = useState<StagedMaterial[]>([]);

    // Materialer vælges lokalt (US-42/US-43), FØR opgaven findes - RPC'en
    // reserve_item_units kræver et task_id, så de reserveres først i
    // samme klik som selve oprettelsen (se handleSubmit). createdTaskId
    // huskes internt (ikke en synlig ekstra visning), så et gentaget klik
    // efter en delvist mislykket reservation ikke opretter opgaven igen.
    const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

    const [createTask, { isLoading: isCreatingTask, error: createError }] = useCreateTaskMutation();
    const [reserveItemUnits, { isLoading: isReserving, error: reserveError }] = useReserveItemUnitsMutation();
    const { data: rooms = [] } = useGetRoomsQuery();

    if (!isOpen) {
        return null;
    }

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setEndDate('');
        setPriority(null);
        setMaxAssignees(null);
        setRequiresApproval(true);
        setRoomId(selectedRoomId);
        setPendingMaterials([]);
        setCreatedTaskId(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            return;
        }

        try {
            let taskId = createdTaskId;

            if (!taskId) {
                const task = await createTask({
                    title: title.trim(),
                    description: description.trim(),
                    start_date: today,
                    end_date: endDate || null,
                    priority,
                    requires_approval: requiresApproval,
                    max_assignees: maxAssignees,
                    room_id: roomId,
                }).unwrap();

                taskId = task.id;
                setCreatedTaskId(taskId);
            }

            // Reservér én linje ad gangen - stopper ved første fejl (fx
            // udsolgt siden den blev valgt) og lader resten stå i listen,
            // så et gentaget klik kun forsøger de resterende igen, ikke
            // dem der allerede lykkedes.
            let remaining = pendingMaterials;

            for (const pending of pendingMaterials) {
                await reserveItemUnits({ taskId, itemId: pending.item.id, quantity: pending.quantity }).unwrap();
                remaining = remaining.filter((m) => m.key !== pending.key);
                setPendingMaterials(remaining);
            }

            resetForm();
            onClose();
        } catch {
            // Fejl vises gennem createError/reserveError - en allerede
            // oprettet opgave (og allerede reserverede materialer) består.
        }
    };

    const errorMessage = readableError(createError) ?? readableError(reserveError);
    const isSubmitting = isCreatingTask || isReserving;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border-gray bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <div className="overflow-y-auto p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-primary dark:text-slate-100">
                        {t('create.heading')}
                    </h2>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        <X />
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                        {errorMessage}
                    </div>
                )}

                <div className="space-y-4">
                    {/* TITEL */}
                    <div>
                        <label
                            htmlFor="task-title"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('common:title')}
                        </label>

                        <input
                            id="task-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('create.titlePlaceholder')}
                            className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-primary outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* BESKRIVELSE */}
                    <div>
                        <label
                            htmlFor="task-description"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('common:description')}
                        </label>

                        <textarea
                            id="task-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('create.descriptionPlaceholder')}
                            rows={5}
                            className="w-full resize-y break-words rounded-lg border border-border-gray bg-white px-3 py-2 text-primary outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* RUM */}
                    <div>
                        <label
                            htmlFor="task-room"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('fields.room')}
                        </label>

                        <select
                            id="task-room"
                            value={roomId ?? ''}
                            onChange={(e) =>
                                setRoomId(e.target.value || null)
                            }
                            className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-primary outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">{t('rooms.choose')}</option>

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
                                className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                            >
                                {t('fields.startDate')}
                            </label>

                            <input
                                id="task-start-date"
                                type="date"
                                value={today}
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-border-gray bg-bg-gray px-3 py-2 text-secondary outline-none dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400"
                            />
                        </div>

                        {/* SLUTDATO */}
                        <div>
                            <label
                                htmlFor="task-end-date"
                                className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                            >
                                {t('fields.endDate')}
                            </label>

                            <input
                                id="task-end-date"
                                type="date"
                                value={endDate}
                                min={today}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-primary outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* PRIORITET */}
                    <div>
                        <label
                            htmlFor="task-priority"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('fields.priority')}
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
                            className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-primary outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                            htmlFor="task-max-assignees"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('fields.maxAssignees')}
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
                            className="w-full rounded-lg border border-border-gray bg-white px-3 py-2 text-primary outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">{t('assignees.noLimit')}</option>
                            <option value="1">{t('assignees.count', { count: 1 })}</option>
                            <option value="2">{t('assignees.count', { count: 2 })}</option>
                            <option value="3">{t('assignees.count', { count: 3 })}</option>
                            <option value="4">{t('assignees.count', { count: 4 })}</option>
                            <option value="5">{t('assignees.count', { count: 5 })}</option>
                            <option value="10">{t('assignees.count', { count: 10 })}</option>
                        </select>
                    </div>

                    {/* MATERIALER */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400">
                            {t('materials.heading')}
                        </label>

                        {pendingMaterials.length > 0 && (
                            <div className="mb-2 space-y-2">
                                {pendingMaterials.map((pending) => (
                                    <div
                                        key={pending.key}
                                        className="flex items-center justify-between rounded-lg border border-border-gray px-3 py-2 dark:border-slate-700"
                                    >
                                        <span className="text-sm text-primary dark:text-slate-100">
                                            {pending.item.name} - {pending.quantity} {pending.item.unitOfMeasurement}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPendingMaterials((prev) =>
                                                    prev.filter((m) => m.key !== pending.key)
                                                )
                                            }
                                            className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                                        >
                                            {t('materials.release')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <TaskItemPicker
                            onStage={(item, quantity) =>
                                setPendingMaterials((prev) => [
                                    ...prev,
                                    { key: `${item.id}-${prev.length}-${Date.now()}`, item, quantity },
                                ])
                            }
                        />
                    </div>

                    {/* GODKENDELSE */}
                    <div className="pt-3">
                        <div className="flex items-center justify-between rounded-lg border border-border-gray bg-bg-gray px-4 py-3 dark:border-slate-700 dark:bg-slate-700">
                            <p className="text-sm font-medium text-primary dark:text-slate-100">
                                {requiresApproval
                                    ? t('create.requiresApproval')
                                    : t('create.noApproval')}
                            </p>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={requiresApproval}
                                onClick={() =>
                                    setRequiresApproval((current) => !current)
                                }
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${requiresApproval
                                        ? 'bg-green-500'
                                        : 'bg-gray-300 dark:bg-slate-500'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${requiresApproval
                                            ? 'translate-x-5'
                                            : 'translate-x-0.5'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* KNAPPER */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg px-4 py-2 text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim()}
                        className="rounded-lg bg-accent px-4 py-2 text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                    >
                        {isSubmitting ? t('common:saving') : t('create.heading')}
                    </button>
                </div>
              </div>
            </div>
        </div>
    );
}
