import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { TaskPageShell } from '../../components/Task/TaskPageShell';
import { CompletedTasksPanel } from '../../components/dashboard/CompletedTasksPanel';
import { useGetRoomsQuery } from '../../store/apis/taskApi';
import { VIEW_COMPLETED_TASKS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi';
import { useTaskPermissions } from '../../store/hooks/useTaskPermissions';

// /tasks/afsluttede: fanen "Afsluttede" i RoomBar. Genbruger dashboardets
// CompletedTasksPanel (søg inkl. rum og tilmeldte, sortering, periode).
// Gatingen her er UX - tasks-select-policyen kræver view_completed_tasks
// for afsluttede opgaver (tilmeldte ser dog altid egne).
export function CompletedTasksPage() {
    const { t } = useTranslation(['tasks', 'common'])
    const { canRead, isLoading: loadingRead } = useTaskPermissions();
    const { hasPrivilege: canViewCompleted, isLoading: loadingCompleted } = useHasPrivilege(VIEW_COMPLETED_TASKS_PRIVILEGE);
    const { data: rooms = [], isLoading: roomsLoading, error: roomsError } = useGetRoomsQuery(undefined, { skip: !canRead });

    return (
        <TaskPageShell
            isLoading={loadingRead || loadingCompleted || roomsLoading}
            hasAccess={canRead && canViewCompleted}
            noAccessText={t('completed.noAccess')}
            rooms={rooms}
            error={readableError(roomsError)}
            heading={<h1>{t('completed.heading')}</h1>}
            subtitle={t('completed.subtitle')}
        >
            <CompletedTasksPanel />
        </TaskPageShell>
    );
}
