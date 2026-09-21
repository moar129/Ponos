import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { useUpdateRoomMutation } from '../../store/apis/taskApi';
import type { Room } from '../../types/Task/Task';

interface EditRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    rooms: Room[];
}

export function EditRoomModal({
    isOpen,
    onClose,
    rooms,
}: EditRoomModalProps) {
  const { t } = useTranslation(['tasks', 'common'])
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [roomName, setRoomName] = useState('');

    const [updateRoom, { isLoading, isError }] = useUpdateRoomMutation();

    if (!isOpen) {
        return null;
    }

    const handleRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);

        const room = rooms.find((room) => room.id === roomId);
        setRoomName(room?.name ?? '');
    };

    const handleSave = async () => {
        const trimmedName = roomName.trim();

        if (!selectedRoomId || !trimmedName) {
            return;
        }

        try {
            await updateRoom({
                id: selectedRoomId,
                name: trimmedName,
            }).unwrap();

            onClose();
        } catch {
            // Fejlen vises via isError
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white border border-border-gray p-6 shadow-2xl dark:bg-slate-800 dark:border-slate-700">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-primary dark:text-slate-100">
                        {t('editRoom.heading')}
                    </h2>

                    <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                        {t('editRoom.intro')}
                    </p>
                </div>

                <div className="space-y-4">

                    <div>
                        <label
                            htmlFor="edit-room-select"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('rooms.choose')}
                        </label>

                        <select
                            id="edit-room-select"
                            value={selectedRoomId}
                            onChange={(e) => handleRoomChange(e.target.value)}
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="">{t('rooms.choose')}</option>

                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="edit-room-name"
                            className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400"
                        >
                            {t('common:name')}
                        </label>

                        <input
                            id="edit-room-name"
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={!selectedRoomId}
                            placeholder={t('editRoom.namePlaceholder')}
                            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:bg-bg-gray disabled:text-secondary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                        />
                    </div>

                    {isError && (
                        <p className="text-sm text-red-700 dark:text-red-400">
                            {t('editRoom.failed')}
                        </p>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        {t('common:cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={
                            isLoading ||
                            !selectedRoomId ||
                            !roomName.trim()
                        }
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? t('common:saving') : t('common:save')}
                    </button>
                </div>
            </div>
        </div>
    );
}