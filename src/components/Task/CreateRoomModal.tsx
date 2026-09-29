import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { useCreateRoomMutation } from '../../store/apis/taskApi';
import type { CreateRoomModalProps } from '../../types/Task/Task';
import { RoomRolePicker } from './RoomRolePicker';

// Delt "Opret rum"-modal til RoomBar'ens "+" på alle /tasks-faner.
// Mountes kun når åben, så formularen altid starter tom.
export function CreateRoomModal({ onClose }: CreateRoomModalProps) {
    const { t } = useTranslation(['tasks', 'common'])
    const [name, setName] = useState('');
    const [roleIds, setRoleIds] = useState<string[]>([]);

    const [createRoom, { isLoading, error }] = useCreateRoomMutation();

    const errorMessage = readableError(error);

    const handleSave = async () => {
        const roomName = name.trim();

        if (!roomName || isLoading) {
            return;
        }

        try {
            await createRoom({ name: roomName, roleIds }).unwrap();
            onClose();
        } catch {
            // Fejlen vises via error
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 className="text-xl font-bold text-primary mb-4 dark:text-slate-100">{t('page.createRoom')}</h3>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('page.roomNamePlaceholder')}
                    className="w-full rounded-xl border border-border-gray bg-white text-primary px-3 py-2 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            void handleSave();
                        }
                    }}
                    autoFocus
                />

                <div className="mt-4">
                    <RoomRolePicker
                        selectedRoleIds={roleIds}
                        onChange={setRoleIds}
                        suggestedRoleName={name}
                    />
                </div>

                {errorMessage && (
                    <p className="mt-4 text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                )}

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-gray-300 transition-colors dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isLoading || !name.trim()}
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? t('common:saving') : t('page.saveRoom')}
                    </button>
                </div>
            </div>
        </div>
    );
}
