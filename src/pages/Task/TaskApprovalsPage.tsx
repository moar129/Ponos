import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { RoomBar } from '../../components/Task/RoomBar';
import { CreateRoomModal } from '../../components/Task/CreateRoomModal';
import { TaskApprovalsPanel } from '../../components/dashboard/TaskApprovalsPanel';
import { useGetRoomsQuery } from '../../store/apis/taskApi';
import {
    APPROVE_TASK_PRIVILEGE,
    CREATE_TASKS_PRIVILEGE,
    DELETE_TASKS_PRIVILEGE,
    READ_TASKS_PRIVILEGE,
    REJECT_TASK_PRIVILEGE,
    UPDATE_TASKS_PRIVILEGE,
    useHasAnyPrivilege,
    useHasPrivilege,
} from '../../store/apis/privilegeApi';

// /tasks/godkend: fanen "Til godkendelse" i RoomBar. Genbruger dashboardets
// TaskApprovalsPanel (godkend/afvis m. begrundelse, detaljer). Adgang =
// approve_task eller reject_task; RPC'erne håndhæver privilegie og
// rum-adgang server-side. En godkender behøver ikke read_tasks (US-75) -
// uden den vises siden bare uden RoomBar.
export function TaskApprovalsPage() {
    const { t } = useTranslation(['tasks', 'common'])

    const { hasPrivilege: canReview, isLoading: loadingReview } =
        useHasAnyPrivilege([APPROVE_TASK_PRIVILEGE, REJECT_TASK_PRIVILEGE]);
    const { hasPrivilege: canRead } = useHasPrivilege(READ_TASKS_PRIVILEGE);
    const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_TASKS_PRIVILEGE);
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_TASKS_PRIVILEGE);
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_TASKS_PRIVILEGE);

    const { data: rooms = [], error: roomsError } = useGetRoomsQuery(undefined, { skip: !canRead });

    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);

    if (loadingReview) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="font-semibold">{t('page.loading')}</p>
            </div>
        );
    }

    if (!canReview) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="text-secondary dark:text-slate-400">{t('approvals.noAccess')}</p>
            </div>
        );
    }

    const pageError = readableError(roomsError);

    return (
        <div className="flex flex-col bg-white text-primary dark:bg-slate-900 dark:text-slate-100">

            {/* ROOM BAR - kun med read_tasks; rum-klik navigerer til /tasks */}
            {canRead && (
                <RoomBar
                    rooms={rooms}
                    selectedRoomId={null}
                    onSelectRoom={() => {}}
                    onAddRoom={() => setIsAddRoomOpen(true)}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    canFavorite={canRead}
                />
            )}

            {/* CREATE ROOM */}
            {isAddRoomOpen && (
                <CreateRoomModal onClose={() => setIsAddRoomOpen(false)} />
            )}

            <div className="flex-1 w-full py-4 sm:py-8 lg:px-2">
                {pageError && (
                    <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                        {pageError}
                    </div>
                )}

                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold break-words text-primary dark:text-slate-100">{t('approvals.heading')}</h1>
                    <p className="text-secondary mt-1 dark:text-slate-400">{t('approvals.subtitle')}</p>
                </div>

                <TaskApprovalsPanel />
            </div>
        </div>
    );
}
