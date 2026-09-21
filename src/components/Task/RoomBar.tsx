import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react';
import type { RoomBarProps } from '../../types/Task/Task';
import { EditRoomModal } from './EditRoomModal';
import { DeleteRoomModal } from './DeleteRoomModal';

export function RoomBar({
    rooms,
    selectedRoomId,
    onSelectRoom,
    onAddRoom,
    canCreate,
    canUpdate,
    canDelete,
    
}: RoomBarProps) {
  const { t } = useTranslation(['tasks', 'common'])
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
    const [isDeleteRoomOpen, setIsDeleteRoomOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen) return;

        function handlePointerDown(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isMenuOpen]);

    return (
        <div className="w-full bg-white dark:bg-slate-900">
            <div className="max-w-[1600px] mx-auto px-8">
                <div className="flex items-center gap-1">

                    {/* ROOMS */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                        <button
                            onClick={() => onSelectRoom(null)}
                            className={`
                                px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                                ${selectedRoomId === null
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                                }
                            `}
                        >
                            {t('common:all')}
                        </button>

                        {rooms.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => {
                                    onSelectRoom(room.id);
                                    setIsMenuOpen(false);
                                }}
                                className={`
                                    px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                                    ${selectedRoomId === room.id
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                                    }
                                `}
                            >
                                {room.name}
                            </button>
                        ))}

                        {canCreate && (
                            <button
                                onClick={onAddRoom}
                                className="px-4 py-3 text-lg text-secondary hover:text-primary transition dark:text-slate-400 dark:hover:text-slate-100"
                                title={t('rooms.create')}
                            >
                                +
                            </button>
                        )}
                    </div>

                    {/* MORE MENU */}
                    {(canUpdate || canDelete) && (
                        <div className="relative ml-auto flex-shrink-0" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setIsMenuOpen((open) => !open)}
                                className="rounded-lg p-2 text-secondary hover:bg-bg-gray hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                aria-label={t('rooms.moreActions')}
                            >
                                <MoreHorizontal size={22} />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border-gray bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                    {canUpdate && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsEditRoomOpen(true);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                                        >
                                            {t('rooms.edit')}
                                        </button>
                                    )}

                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsDeleteRoomOpen(true);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                        >
                                            {t('rooms.deleteOne')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* EDIT ROOM MODAL */}
            <EditRoomModal
                isOpen={isEditRoomOpen}
                onClose={() => setIsEditRoomOpen(false)}
                rooms={rooms}
            />

            {/* DELETE ROOM MODAL */}
            <DeleteRoomModal
                isOpen={isDeleteRoomOpen}
                onClose={() => setIsDeleteRoomOpen(false)}
                rooms={rooms}
            />

        </div>
    );
}