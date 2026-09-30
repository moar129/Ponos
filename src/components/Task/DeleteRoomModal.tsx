import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { useDeleteRoomMutation, useGetTasksQuery } from '../../store/apis/taskApi';
import { toggleInArray } from '../../utils/toggle';
import type { DeleteRoomModalProps } from '../../types/Task/Task';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';
import { RoomSelect } from './RoomSelect';
import { TASK_LABEL } from './taskFormStyles';

// Slet et rum. De valgte opgaver slettes med; resten flyttes til "Uden rum".
// Mountes kun når åben, så valget altid starter forfra.
export function DeleteRoomModal({ onClose, rooms }: DeleteRoomModalProps) {
    const { t } = useTranslation(['tasks', 'common'])
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    const [deleteRoom, { isLoading, error }] = useDeleteRoomMutation();
    const { data: tasks = [] } = useGetTasksQuery();

    const roomTasks = tasks.filter((task) => task.room_id === selectedRoomId);

    const handleRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);
        setSelectedTaskIds([]);
    };

    const handleDelete = async () => {
        if (!selectedRoomId) {
            return;
        }

        try {
            await deleteRoom({ roomId: selectedRoomId, taskIdsToDelete: selectedTaskIds }).unwrap();
            onClose();
        } catch {
            // Fejlen vises via error
        }
    };

    return (
        <Modal
            onClose={onClose}
            title={t('deleteRoom.heading')}
            subtitle={t('deleteRoom.intro')}
            size="lg"
            disableClose={isLoading}
            footer={
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isLoading || !selectedRoomId}
                        className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? t('common:deleting') : t('deleteRoom.submit')}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    >
                        {t('common:close')}
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                <div>
                    <label htmlFor="delete-room-select" className={TASK_LABEL}>{t('rooms.choose')}</label>
                    <RoomSelect id="delete-room-select" rooms={rooms} value={selectedRoomId} onChange={handleRoomChange} />
                </div>

                {selectedRoomId && (
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-secondary dark:text-slate-400">{t('deleteRoom.tasksInRoom')}</p>
                                <p className="text-xs text-secondary dark:text-slate-400">{t('deleteRoom.chooseTasks')}</p>
                            </div>

                            <span className="text-xs font-medium text-secondary dark:text-slate-400">
                                {t('common:selectedCount', { count: selectedTaskIds.length })}
                            </span>
                        </div>

                        {roomTasks.length > 0 ? (
                            <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-border-gray p-2 dark:border-slate-700">
                                {roomTasks.map((task) => {
                                    const isSelected = selectedTaskIds.includes(task.id);

                                    return (
                                        <label
                                            key={task.id}
                                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                                                isSelected
                                                    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/30'
                                                    : 'border-border-gray hover:bg-bg-gray dark:border-slate-700 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => setSelectedTaskIds((current) => toggleInArray(current, task.id))}
                                                className="mt-1 h-4 w-4 rounded border-border-gray text-accent focus:ring-accent dark:border-slate-700"
                                            />

                                            <div className="min-w-0">
                                                <p className="break-words text-sm font-medium text-primary dark:text-slate-100">{task.title}</p>
                                                {task.description && (
                                                    <p className="mt-1 break-words text-xs text-secondary dark:text-slate-400">{task.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg bg-bg-gray/40 p-4 dark:bg-slate-900/40">
                                <p className="text-sm text-secondary dark:text-slate-400">{t('deleteRoom.noTasks')}</p>
                            </div>
                        )}

                        {roomTasks.length > 0 && (
                            <p className="mt-3 text-xs text-secondary dark:text-slate-400">
                                <Trans ns="tasks" i18nKey="deleteRoom.keptNote" values={{ room: t('rooms.noRoom') }} components={{ b: <strong /> }} />
                            </p>
                        )}
                    </div>
                )}

                <Alert>{readableError(error)}</Alert>
            </div>
        </Modal>
    );
}
