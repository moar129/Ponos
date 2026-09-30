import { readableError } from '../../ErrorMessage';
import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import {
    useDeleteTaskMutation,
    useGetTaskMaterialsQuery,
    useUpdateTaskMutation,
} from '../../store/apis/taskApi';
import { useApplyMaterialOutcomes } from '../../store/hooks/useApplyMaterialOutcomes';
import { todayDateKey } from '../../utils/calendar';
import type { EditTaskModalProps, MaterialOutcomeEntry, TaskFormValues } from '../../types/Task/Task';
import { ResolveTaskMaterialsModal } from './ResolveTaskMaterialsModal';
import { TaskMaterialsList } from './TaskMaterialsList';
import { TaskFormFields } from './TaskFormFields';
import { TASK_LABEL } from './taskFormStyles';
import { Alert } from '../common/Alert';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';

// Kalderen mounter kun modal'en, mens den er åben - derfor starter
// felterne altid fra opgavens nuværende værdier.
export function EditTaskModal({ onClose, task, canUpdate, canDelete, assigneeNames }: EditTaskModalProps) {
    const { t } = useTranslation(['tasks', 'common'])

    const [values, setValues] = useState<TaskFormValues>(() => ({
        title: task.title,
        description: task.description ?? '',
        startDate: task.start_date ? task.start_date.slice(0, 10) : todayDateKey(),
        endDate: task.end_date ? task.end_date.slice(0, 10) : '',
        priority: task.priority,
        maxAssignees: task.max_assignees,
    }));
    const [dateError, setDateError] = useState<string | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [showReleaseModal, setShowReleaseModal] = useState(false);

    const [updateTask, { isLoading, error }] = useUpdateTaskMutation();
    const [deleteTask, { isLoading: isDeleting, error: deleteError }] = useDeleteTaskMutation();
    const { release } = useApplyMaterialOutcomes(task.id);
    const { data: materials = [] } = useGetTaskMaterialsQuery(task.id);

    const unresolvedMaterials = materials.filter((m) => !m.resolved);

    // Har opgaven stadig linkede materialer, vælger brugeren først deres
    // slutstatus (ResolveTaskMaterialsModal, mode deleteTask). Frigivelse
    // kræver update_tasks - uden den slettes direkte, og triggeren
    // release_units_on_task_material_delete anvender fallback-reglen
    // (kun Reserved/InUse -> Available).
    const handleDelete = async () => {
        if (unresolvedMaterials.length > 0 && canUpdate) {
            setIsConfirmingDelete(false);
            setShowReleaseModal(true);
            return;
        }

        try {
            await deleteTask(task.id).unwrap();
            onClose();
        } catch {
            // Fejlen vises gennem deleteError
        }
    };

    // Fejl kastes videre, så modalen selv viser dem.
    const handleReleaseAndDelete = async (entries: MaterialOutcomeEntry[]) => {
        await release(entries);
        await deleteTask(task.id).unwrap();
        setShowReleaseModal(false);
        onClose();
    };

    const handleSubmit = async () => {
        if (!values.title.trim()) {
            return;
        }

        // Slutdato må ikke være før startdato
        if (values.startDate && values.endDate && values.endDate < values.startDate) {
            setDateError(t('edit.endBeforeStart'));
            return;
        }
        setDateError(null);

        try {
            await updateTask({
                id: task.id,
                title: values.title.trim(),
                description: values.description.trim(),
                start_date: values.startDate || null,
                end_date: values.endDate || null,
                priority: values.priority,
                max_assignees: values.maxAssignees,
                room_id: task.room_id,
            }).unwrap();

            onClose();
        } catch {
            // Fejlen vises gennem error
        }
    };

    return (
        <>
            <Modal
                onClose={onClose}
                title={t('edit.heading')}
                size="2xl"
                closeOnBackdrop={false}
                footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading || !values.title.trim() || !canUpdate}
                            className="rounded-lg bg-accent px-4 py-2 text-accent-text hover:bg-accent-hover transition-colors disabled:opacity-60"
                        >
                            {isLoading ? t('common:saving') : t('common:save')}
                        </button>

                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(true)}
                                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                                {t('edit.deleteTask')}
                            </button>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    <Alert>{readableError(error)}</Alert>

                    <TaskFormFields
                        idPrefix="edit-task"
                        values={values}
                        onChange={(patch) => {
                            setValues((current) => ({ ...current, ...patch }));
                            if (patch.endDate !== undefined) setDateError(null);
                        }}
                        dateError={dateError}
                    />

                    {/* ANSVARLIGE (kun visning - tilmelding styres fra TaskCard) */}
                    <div>
                        <span className={TASK_LABEL}>{t('card.responsible')}</span>

                        {assigneeNames.length === 0 ? (
                            <p className="text-sm text-secondary dark:text-slate-400">{t('assignees.nobodyAssigned')}</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {assigneeNames.map((name, index) => (
                                    <span
                                        key={index}
                                        className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-primary dark:bg-slate-700 dark:text-slate-100"
                                    >
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MATERIALER */}
                    <div>
                        <span className={TASK_LABEL}>{t('materials.heading')}</span>
                        <TaskMaterialsList taskId={task.id} canManage={canUpdate} taskStatus={task.status} />
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmingDelete}
                title={t('edit.confirmDelete', { name: task.title })}
                confirmLabel={t('common:confirmDeleteYes')}
                isLoading={isDeleting}
                error={readableError(deleteError)}
                onConfirm={handleDelete}
                onCancel={() => setIsConfirmingDelete(false)}
            />

            {showReleaseModal && (
                <ResolveTaskMaterialsModal
                    mode="deleteTask"
                    materials={materials}
                    onCancel={() => setShowReleaseModal(false)}
                    onConfirm={handleReleaseAndDelete}
                />
            )}
        </>
    );
}
