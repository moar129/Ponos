import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { TaskPageShell } from '../../components/Task/TaskPageShell';
import { TaskApprovalsPanel } from '../../components/dashboard/TaskApprovalsPanel';
import { useGetRoomsQuery } from '../../store/apis/taskApi';
import { APPROVE_TASK_PRIVILEGE, REJECT_TASK_PRIVILEGE, useHasAnyPrivilege } from '../../store/apis/privilegeApi';
import { useTaskPermissions } from '../../store/hooks/useTaskPermissions';

// /tasks/godkend: fanen "Til godkendelse" i RoomBar. Genbruger dashboardets
// TaskApprovalsPanel (godkend/afvis m. begrundelse, detaljer). Adgang =
// approve_task eller reject_task; RPC'erne håndhæver privilegie og
// rum-adgang server-side. En godkender behøver ikke read_tasks (US-75) -
// uden den vises siden bare uden RoomBar.
export function TaskApprovalsPage() {
    const { t } = useTranslation(['tasks', 'common'])
    const { hasPrivilege: canReview, isLoading: loadingReview } = useHasAnyPrivilege([APPROVE_TASK_PRIVILEGE, REJECT_TASK_PRIVILEGE]);
    const { canRead } = useTaskPermissions();
    const { data: rooms = [], error: roomsError } = useGetRoomsQuery(undefined, { skip: !canRead });

    return (
        <TaskPageShell
            isLoading={loadingReview}
            hasAccess={canReview}
            noAccessText={t('approvals.noAccess')}
            rooms={canRead ? rooms : undefined}
            error={readableError(roomsError)}
            heading={<h1>{t('approvals.heading')}</h1>}
            subtitle={t('approvals.subtitle')}
        >
            <TaskApprovalsPanel />
        </TaskPageShell>
    );
}
