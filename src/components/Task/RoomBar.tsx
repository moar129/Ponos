import type { RoomBarProps } from '../../types/Task/Task';

export function RoomBar({ rooms, selectedRoomId, onSelectRoom, onAddRoom }: RoomBarProps) {
    return (
        <div className="w-full bg-white border-b border-gray-200">
            <div className="max-w-[1600px] mx-auto px-8">
                <div className="flex items-center gap-1 overflow-x-auto">

                    <button
                        onClick={() => onSelectRoom(null)}
                        className={`
                            px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                            ${
                                selectedRoomId === null
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
                            onClick={() => onSelectRoom(room.id)}
                            className={`
                                px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition
                                ${
                                    selectedRoomId === room.id
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
            </div>
        </div>
    );
}