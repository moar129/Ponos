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
        <div className="w-full bg-white">
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
                                    : 'border-transparent text-secondary hover:text-primary'
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
                                        : 'border-transparent text-secondary hover:text-primary'
                                    }
                                `}
                            >
                                {room.name}
                            </button>
                        ))}

                        <button
                            onClick={onAddRoom}
                            className="px-4 py-3 text-lg text-secondary hover:text-primary transition"
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
                            className="rounded-lg p-2 text-secondary hover:bg-bg-gray hover:text-primary"
                            aria-label="Flere handlinger"
                        >
                            <MoreHorizontal size={22} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border-gray bg-white py-1 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsEditRoomOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-medium text-secondary hover:bg-bg-gray"
                                >
                                    Rediger rum
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsDeleteRoomOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
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