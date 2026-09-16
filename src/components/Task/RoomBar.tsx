import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { RoomBarProps } from '../../types/Task/Task';
import { EditRoomModal } from './EditRoomModal';
import { DeleteRoomModal } from './DeleteRoomModal';

export function RoomBar({
    rooms,
    selectedRoomId,
    onSelectRoom,
    onAddRoom,
}: RoomBarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
    const [isDeleteRoomOpen, setIsDeleteRoomOpen] = useState(false);

    return (
        <div className="w-full bg-surface">
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
                                    : 'border-transparent text-slate-400 hover:text-slate-100'
                                }
                            `}
                        >
                            Alle
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
                                        : 'border-transparent text-slate-400 hover:text-slate-100'
                                    }
                                `}
                            >
                                {room.name}
                            </button>
                        ))}

                        <button
                            onClick={onAddRoom}
                            className="px-4 py-3 text-lg text-slate-500 hover:text-slate-100 transition"
                            title="Opret rum"
                        >
                            +
                        </button>
                    </div>

                    {/* MORE MENU */}
                    <div className="relative ml-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen((open) => !open)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                            aria-label="Flere handlinger"
                        >
                            <MoreHorizontal size={22} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-800 bg-surface py-1 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsEditRoomOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-800"
                                >
                                    Rediger rum
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsDeleteRoomOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-medium text-red-400 hover:bg-red-500/10"
                                >
                                    Slet et rum
                                </button>
                            </div>
                        )}
                    </div>
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