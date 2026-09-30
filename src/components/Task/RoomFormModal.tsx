import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { useCreateRoomMutation, useUpdateRoomMutation } from '../../store/apis/taskApi';
import type { RoomFormModalProps } from '../../types/Task/Task';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';
import { RoomRolePicker } from './RoomRolePicker';
import { RoomSelect } from './RoomSelect';
import { TASK_INPUT, TASK_LABEL } from './taskFormStyles';

// Opret rum (uden rooms) eller rediger et eksisterende (med rooms - vælg
// først hvilket). Rum + rolle-begrænsning gemmes atomisk via RPC'erne
// create_task_room/update_task_room. Mountes kun når åben, så formularen
// altid starter tom.
export function RoomFormModal({ onClose, rooms }: RoomFormModalProps) {
    const { t } = useTranslation(['tasks', 'common'])
    const isEdit = rooms !== undefined;

    const [roomId, setRoomId] = useState('');
    const [name, setName] = useState('');
    const [roleIds, setRoleIds] = useState<string[]>([]);

    const [createRoom, { isLoading: creating, error: createError }] = useCreateRoomMutation();
    const [updateRoom, { isLoading: updating, error: updateError }] = useUpdateRoomMutation();
    const isSaving = creating || updating;

    const selectRoom = (id: string) => {
        const room = rooms?.find((r) => r.id === id);
        setRoomId(id);
        setName(room?.name ?? '');
        setRoleIds(room?.role_ids ?? []);
    };

    const canSave = Boolean(name.trim()) && (!isEdit || Boolean(roomId)) && !isSaving;

    const handleSave = async () => {
        if (!canSave) return;

        try {
            if (isEdit) await updateRoom({ id: roomId, name: name.trim(), roleIds }).unwrap();
            else await createRoom({ name: name.trim(), roleIds }).unwrap();
            onClose();
        } catch {
            // Fejlen vises via createError/updateError
        }
    };

    const fieldsDisabled = isEdit && !roomId;

    return (
        <Modal
            onClose={onClose}
            title={isEdit ? t('editRoom.heading') : t('page.createRoom')}
            subtitle={isEdit ? t('editRoom.intro') : undefined}
            closeOnBackdrop={false}
            onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
            }}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="submit"
                        disabled={!canSave}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? t('common:saving') : isEdit ? t('common:save') : t('page.saveRoom')}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {isEdit && (
                    <div>
                        <label htmlFor="room-form-select" className={TASK_LABEL}>{t('rooms.choose')}</label>
                        <RoomSelect id="room-form-select" rooms={rooms} value={roomId} onChange={selectRoom} />
                    </div>
                )}

                <div>
                    <label htmlFor="room-form-name" className={TASK_LABEL}>{t('common:name')}</label>
                    <input
                        id="room-form-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={fieldsDisabled}
                        placeholder={isEdit ? t('editRoom.namePlaceholder') : t('page.roomNamePlaceholder')}
                        className={TASK_INPUT}
                        autoFocus={!isEdit}
                    />
                </div>

                <RoomRolePicker
                    selectedRoleIds={roleIds}
                    onChange={setRoleIds}
                    disabled={fieldsDisabled}
                    suggestedRoleName={name}
                />

                <Alert>{readableError(isEdit ? updateError : createError)}</Alert>
            </div>
        </Modal>
    );
}
