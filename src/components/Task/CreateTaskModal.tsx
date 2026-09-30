import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import { useCreateTaskMutation } from '../../store/apis/taskApi';
import { useReserveItemUnitsMutation } from '../../store/apis/categoryApi';
import { todayDateKey } from '../../utils/calendar';
import type { CreateTaskModalProps, StagedLocation, TaskFormValues } from '../../types/Task/Task';
import type { AggregatedItem } from '../../types/dataLayer/datalayerTypes';
import { TaskItemPicker } from './TaskItemPicker';
import { TaskFormFields } from './TaskFormFields';
import { TASK_LABEL } from './taskFormStyles';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';

interface StagedMaterial {
    key: string;
    item: AggregatedItem;
    quantity: number;
    location: StagedLocation;
}

// Forælderen mounter kun modal'en, mens den er åben - derfor starter
// formularen altid tom, med det rum brugeren står i (selectedRoomId).
export function CreateTaskModal({ onClose, selectedRoomId }: CreateTaskModalProps) {
    const { t } = useTranslation(['tasks', 'common'])

    const [values, setValues] = useState<TaskFormValues>(() => ({
        title: '',
        description: '',
        roomId: selectedRoomId,
        startDate: todayDateKey(),
        endDate: '',
        priority: null,
        maxAssignees: null,
    }));
    const [requiresApproval, setRequiresApproval] = useState(true);
    const [pendingMaterials, setPendingMaterials] = useState<StagedMaterial[]>([]);

    // Materialer vælges lokalt (US-42/US-43), FØR opgaven findes - RPC'en
    // reserve_item_units kræver et task_id, så de reserveres først i
    // samme klik som selve oprettelsen (se handleSubmit). createdTaskId
    // huskes internt, så et gentaget klik efter en delvist mislykket
    // reservation ikke opretter opgaven igen.
    const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

    const [createTask, { isLoading: isCreatingTask, error: createError }] = useCreateTaskMutation();
    const [reserveItemUnits, { isLoading: isReserving, error: reserveError }] = useReserveItemUnitsMutation();

    const handleSubmit = async () => {
        if (!values.title.trim()) {
            return;
        }

        try {
            let taskId = createdTaskId;

            if (!taskId) {
                const task = await createTask({
                    title: values.title.trim(),
                    description: values.description.trim(),
                    start_date: values.startDate,
                    end_date: values.endDate || null,
                    priority: values.priority,
                    requires_approval: requiresApproval,
                    max_assignees: values.maxAssignees,
                    room_id: values.roomId,
                }).unwrap();

                taskId = task.id;
                setCreatedTaskId(taskId);
            }

            // Reservér én linje ad gangen - stopper ved første fejl (fx
            // udsolgt siden den blev valgt) og lader resten stå i listen,
            // så et gentaget klik kun forsøger de resterende igen.
            let remaining = pendingMaterials;

            for (const pending of pendingMaterials) {
                await reserveItemUnits({
                    taskId,
                    itemId: pending.item.id,
                    quantity: pending.quantity,
                    locationId: pending.location.id,
                }).unwrap();
                remaining = remaining.filter((m) => m.key !== pending.key);
                setPendingMaterials(remaining);
            }

            onClose();
        } catch {
            // Fejl vises gennem createError/reserveError - en allerede
            // oprettet opgave (og allerede reserverede materialer) består.
        }
    };

    const errorMessage = readableError(createError) ?? readableError(reserveError);
    const isSubmitting = isCreatingTask || isReserving;

    return (
        <Modal
            onClose={onClose}
            title={t('create.heading')}
            size="2xl"
            closeOnBackdrop={false}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !values.title.trim()}
                        className="rounded-lg bg-accent px-4 py-2 text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-60"
                    >
                        {isSubmitting ? t('common:saving') : t('create.heading')}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <Alert>{errorMessage}</Alert>

                <TaskFormFields
                    idPrefix="task"
                    values={values}
                    onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
                />

                {/* MATERIALER */}
                <div>
                    <span className={TASK_LABEL}>{t('materials.heading')}</span>

                    {pendingMaterials.length > 0 && (
                        <div className="mb-2 space-y-2">
                            {pendingMaterials.map((pending) => (
                                <div
                                    key={pending.key}
                                    className="flex items-center justify-between rounded-lg border border-border-gray px-3 py-2 dark:border-slate-700"
                                >
                                    <span className="text-sm text-primary dark:text-slate-100">
                                        {pending.item.name} - {pending.quantity} {pending.item.unitOfMeasurement} ({pending.location.label})
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setPendingMaterials((prev) => prev.filter((m) => m.key !== pending.key))}
                                        className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                                    >
                                        {t('materials.release')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <TaskItemPicker
                        onStage={(item, quantity, location) =>
                            setPendingMaterials((prev) => [
                                ...prev,
                                { key: `${item.id}-${prev.length}-${Date.now()}`, item, quantity, location },
                            ])
                        }
                    />
                </div>

                {/* GODKENDELSE */}
                <div className="pt-3">
                    <div className="flex items-center justify-between rounded-lg border border-border-gray bg-bg-gray px-4 py-3 dark:border-slate-700 dark:bg-slate-700">
                        <p className="text-sm font-medium text-primary dark:text-slate-100">
                            {requiresApproval ? t('create.requiresApproval') : t('create.noApproval')}
                        </p>

                        <ToggleSwitch
                            checked={requiresApproval}
                            onChange={setRequiresApproval}
                            label={t('create.requiresApproval')}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
