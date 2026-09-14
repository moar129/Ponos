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
        <div className="w-full bg-white border-b border-gray-200">
            <div className="max-w-[1600px] mx-auto px-8">
                <div className="flex items-center gap-1">

                    {/* ROOMS */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                        <button
                            onClick={() => onSelectRoom(null)}
                            className={`
                                px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                                ${selectedRoomId === null
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-900'
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
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                    }
                                `}
                            >
                                {room.name}
                            </button>
                        ))}

                        <button
                            onClick={onAddRoom}
                            className="px-4 py-3 text-lg text-gray-400 hover:text-gray-900 transition"
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
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            aria-label="Flere handlinger"
                        >
                            <MoreHorizontal size={22} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsEditRoomOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
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