import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { TaskBoard } from '../../components/Task/TaskBoard';
import { TaskFilters } from '../../components/Task/TaskFilters';
import { TaskPageShell } from '../../components/Task/TaskPageShell';
import { CreateTaskButton } from '../../components/Task/CreateTaskButton';
import { useTaskBoard } from '../../store/hooks/useTaskBoard';
import { useTaskPermissions } from '../../store/hooks/useTaskPermissions';

// /tasks/mine: de åbne opgaver brugeren er tilmeldt.
export function MyTasksPage() {
    const { t } = useTranslation(['tasks', 'common'])
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

    const { canRead, canCreate, isLoading: loadingPermissions } = useTaskPermissions();
    const board = useTaskBoard({ onlyMine: true, selectedRoomId });

    return (
        <TaskPageShell
            isLoading={board.isLoading || loadingPermissions}
            hasAccess={canRead}
            noAccessText={t('mine.noAccess')}
            rooms={board.rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            toolbar={<TaskFilters board={board} />}
            error={board.error}
            heading={<h1>{t('mine.heading')}</h1>}
            subtitle={t('mine.subtitle')}
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
                    available: { heading: t('mine.availableHeading'), subtitle: t('mine.availableSubtitle'), empty: t('mine.noAvailableTasks') },
                    inProgress: { heading: t('mine.inProgressHeading'), subtitle: t('mine.inProgressSubtitle'), empty: t('mine.noTasksInProgress') },
                }}
            />
        </TaskPageShell>
    );
}
