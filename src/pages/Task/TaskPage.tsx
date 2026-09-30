import { useTranslation } from 'react-i18next'
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { TasksLocationState } from '../../types/Task/Task';
import { TaskBoard } from '../../components/Task/TaskBoard';
import { TaskFilters } from '../../components/Task/TaskFilters';
import { TaskPageShell } from '../../components/Task/TaskPageShell';
import { CreateTaskButton } from '../../components/Task/CreateTaskButton';
import { FavoriteStarButton } from '../../components/common/FavoriteStarButton';
import { useTaskRoomFavorites } from '../../store/hooks/useTaskRoomFavorites';
import { useTaskBoard } from '../../store/hooks/useTaskBoard';
import { useTaskPermissions } from '../../store/hooks/useTaskPermissions';

// /tasks: alle åbne opgaver, evt. afgrænset til ét rum.
export function TasksPage() {
    const { t } = useTranslation(['tasks', 'common'])
    const location = useLocation();
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
        () => (location.state as TasksLocationState | null)?.roomId ?? null
    );

    const { canRead, canCreate, isLoading: loadingPermissions } = useTaskPermissions();
    const board = useTaskBoard({ onlyMine: false, selectedRoomId });
    const { favoriteIds, toggleFavorite, favoriteError } = useTaskRoomFavorites(canRead);

    const selectedRoom = board.rooms.find((room) => room.id === selectedRoomId);

    return (
        <TaskPageShell
            isLoading={board.isLoading || loadingPermissions}
            hasAccess={canRead}
            noAccessText={t('page.noAccess')}
            rooms={board.rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            toolbar={<TaskFilters board={board} />}
            error={board.error ?? favoriteError}
            heading={
                <>
                    <h1>{selectedRoom ? t('page.roomHeading', { room: selectedRoom.name }) : t('page.heading')}</h1>
                    {selectedRoom && (
                        <FavoriteStarButton
                            variant="heading"
                            isFavorite={favoriteIds.has(selectedRoom.id)}
                            onToggle={() => void toggleFavorite(selectedRoom.id)}
                        />
                    )}
                </>
            }
            subtitle={t('page.subtitle')}
            actions={canCreate && <CreateTaskButton selectedRoomId={selectedRoomId} />}
        >
            <TaskBoard
                available={board.available}
                inProgress={board.inProgress}
                openTaskId={board.openTaskId}
                onCloseOpenTask={board.closeOpenTask}
                selectedStatuses={board.selectedStatuses}
                hasActiveFilters={board.activeFilterCount > 0}
                onResetFilters={board.resetFilters}
                labels={{
                    available: { heading: t('page.availableHeading'), empty: t('page.noAvailableTasks') },
                    inProgress: { heading: t('page.inProgressHeading'), empty: t('page.noTasksInProgress') },
                }}
            />
        </TaskPageShell>
    );
}
