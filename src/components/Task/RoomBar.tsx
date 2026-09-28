import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Lock, MoreHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Room, RoomBarProps, TasksLocationState } from '../../types/Task/Task';
import { EditRoomModal } from './EditRoomModal';
import { RoomChatButton } from './RoomChatButton';
import { DeleteRoomModal } from './DeleteRoomModal';
import { FavoriteStarButton } from '../common/FavoriteStarButton';
import { useGetOrganisationRolesQuery } from '../../store/apis/roleApi';
import {
    APPROVE_TASK_PRIVILEGE,
    REJECT_TASK_PRIVILEGE,
    VIEW_COMPLETED_TASKS_PRIVILEGE,
    useHasAnyPrivilege,
    useHasPrivilege,
} from '../../store/apis/privilegeApi';
import { useGetPendingTaskRequestsQuery } from '../../store/apis/taskApi';
import { useTaskRoomFavorites } from '../../store/hooks/useTaskRoomFavorites';
import { splitFavoriteRooms } from '../../utils/splitFavoriteRooms';

export function RoomBar({
    rooms,
    selectedRoomId,
    onSelectRoom,
    onAddRoom,
    canCreate,
    canUpdate,
    canDelete,
    canFavorite,
}: RoomBarProps) {
  const { t } = useTranslation(['tasks', 'common'])
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
    const [isDeleteRoomOpen, setIsDeleteRoomOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);

    const { data: roles = [] } = useGetOrganisationRolesQuery();

    // Favoritter gates separat på canFavorite (read_tasks), uafhængigt af
    // canUpdate/canDelete.
    const { favoriteIds, toggleFavorite, favoriteError } = useTaskRoomFavorites(canFavorite);
    const { favoriteRooms, otherRooms } = splitFavoriteRooms(rooms, favoriteIds);

    const roleNames = (roleIds: string[]) =>
        roles
            .filter((role) => roleIds.includes(role.id))
            .map((role) => role.name)
            .join(', ');

    const navigate = useNavigate();
    const location = useLocation();

    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

    const isAllTasksPage = location.pathname === '/tasks';
    const isMyTasksPage = location.pathname === '/tasks/mine';
    const isCompletedPage = location.pathname === '/tasks/afsluttede';
    const isApprovalsPage = location.pathname === '/tasks/godkend';

    // Fanen "Til godkendelse" - tallet er ventende anmodninger, som
    // get_pending_task_requests allerede har filtreret på rum-adgang.
    const { hasPrivilege: canReview } = useHasAnyPrivilege([APPROVE_TASK_PRIVILEGE, REJECT_TASK_PRIVILEGE]);
    const { data: pendingRequests = [] } = useGetPendingTaskRequestsQuery(undefined, { skip: !canReview });

    // Fanen "Afsluttede" - RLS håndhæver det reelt (tasks-select-policyen).
    const { hasPrivilege: canViewCompleted } = useHasPrivilege(VIEW_COMPLETED_TASKS_PRIVILEGE);

    // Fane-knap og stjerne er søskende i en group-wrapper - en <button>
    // må ikke indeholde en anden <button>.
    const renderRoomTab = (room: Room) => (
        <div
            key={room.id}
            className={`group flex items-center border-b-2 ${
                selectedRoomId === room.id ? 'border-accent' : 'border-transparent'
            }`}
        >
            <button
                type="button"
                onClick={() => {
                    if (!isAllTasksPage) {
                        const state: TasksLocationState = { roomId: room.id };
                        navigate('/tasks', { state });
                    } else {
                        onSelectRoom(room.id);
                    }
                    setIsMenuOpen(false);
                }}
                title={
                    room.role_ids.length > 0
                        ? t('rooms.restrictedTo', { roles: roleNames(room.role_ids) })
                        : undefined
                }
                className={`
                    flex items-center gap-1.5 whitespace-nowrap py-3 text-sm font-medium transition
                    ${canFavorite ? 'pl-4 pr-1' : 'px-4'}
                    ${selectedRoomId === room.id
                        ? 'text-accent'
                        : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                    }
                `}
            >
                {room.role_ids.length > 0 && (
                    <Lock size={14} aria-hidden="true" />
                )}
                {room.name}
            </button>
            {canFavorite && (
                <span className="pr-2">
                    <FavoriteStarButton
                        isFavorite={favoriteIds.has(room.id)}
                        onToggle={() => void toggleFavorite(room.id)}
                    />
                </span>
            )}
        </div>
    );

    useEffect(() => {
        if (!isMenuOpen) return;

        function handlePointerDown(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [isMenuOpen]);

    return (
        <div className="w-full bg-white dark:bg-slate-900">
            <div className="mx-auto max-w-[1600px] px-8">
                <div className="flex items-center gap-1">

                    {/* TABS / ROOMS */}
                    <div className="flex items-center gap-1 overflow-x-auto">

                        {/* ALLE */}
                        <button
                            type="button"
                            onClick={() => {
                                navigate('/tasks');
                                onSelectRoom(null);
                                setIsMenuOpen(false);
                            }}
                            className={`
                                whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition
                                ${isAllTasksPage && selectedRoomId === null
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                                }
                            `}
                        >
                            {t('common:all')}
                        </button>

                        {/* MINE OPGAVER */}
                        <button
                            type="button"
                            onClick={() => {
                                navigate('/tasks/mine');
                                onSelectRoom(null);
                                setIsMenuOpen(false);
                            }}
                            className={`
                                whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition
                                ${isMyTasksPage && selectedRoomId === null
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                                }
                            `}
                        >
                            {t('mine.heading')}
                        </button>

                        {/* TIL GODKENDELSE */}
                        {canReview && (
                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/tasks/godkend');
                                    onSelectRoom(null);
                                    setIsMenuOpen(false);
                                }}
                                className={`
                                    flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition
                                    ${isApprovalsPage
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                                    }
                                `}
                            >
                                {t('approvals.tab')}
                                {pendingRequests.length > 0 && (
                                    <span
                                        className="rounded-full bg-accent px-1.5 text-xs font-bold text-white"
                                        aria-label={t('approvals.pendingCount', { count: pendingRequests.length })}
                                    >
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* AFSLUTTEDE */}
                        {canViewCompleted && (
                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/tasks/afsluttede');
                                    onSelectRoom(null);
                                    setIsMenuOpen(false);
                                }}
                                className={`
                                    whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition
                                    ${isCompletedPage
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                                    }
                                `}
                            >
                                {t('completed.tab')}
                            </button>
                        )}

                        {/* ROOMS */}
                        {favoriteRooms.map(renderRoomTab)}

                        {favoriteRooms.length > 0 && otherRooms.length > 0 && (
                            <span
                                className="mx-1 h-5 w-px shrink-0 bg-border-gray dark:bg-slate-700"
                                aria-hidden="true"
                            />
                        )}

                        {otherRooms.map(renderRoomTab)}

                        {/* ADD ROOM */}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={onAddRoom}
                                className="px-4 py-3 text-lg text-secondary hover:text-primary transition dark:text-slate-400 dark:hover:text-slate-100"
                                title={t('rooms.create')}
                            >
                                +
                            </button>
                        )}
                    </div>

                    <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                        {/* RUM-CHAT - kun rolle-låste rum har en chat */}
                        {isAllTasksPage && selectedRoom && selectedRoom.role_ids.length > 0 && (
                            <RoomChatButton key={selectedRoom.id} roomId={selectedRoom.id} />
                        )}

                        {/* MORE MENU */}
                        {(canUpdate || canDelete) && (
                            <div
                                className="relative flex-shrink-0"
                                ref={menuRef}
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsMenuOpen((open) => !open)
                                    }
                                    className="rounded-lg p-2 text-secondary hover:bg-bg-gray hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                    aria-label={t('rooms.moreActions')}
                                >
                                    <MoreHorizontal size={22} />
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border-gray bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">

                                        {/* EDIT ROOM */}
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

                                        {/* DELETE ROOM */}
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
                {favoriteError && (
                    <p className="pb-2 text-sm text-red-600 dark:text-red-400">{favoriteError}</p>
                )}
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