import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { readableError } from '../../ErrorMessage';
import { RoomBar } from '../../components/Task/RoomBar';
import { CreateRoomModal } from '../../components/Task/CreateRoomModal';
import { CompletedTasksPanel } from '../../components/dashboard/CompletedTasksPanel';
import { useGetRoomsQuery } from '../../store/apis/taskApi';
import {
    CREATE_TASKS_PRIVILEGE,
    DELETE_TASKS_PRIVILEGE,
    READ_TASKS_PRIVILEGE,
    UPDATE_TASKS_PRIVILEGE,
    VIEW_COMPLETED_TASKS_PRIVILEGE,
    useHasPrivilege,
} from '../../store/apis/privilegeApi';

// /tasks/afsluttede: fanen "Afsluttede" i RoomBar. Genbruger dashboardets
// CompletedTasksPanel (søg inkl. rum og tilmeldte, sortering, periode).
// Gatingen her er UX - tasks-select-policyen kræver view_completed_tasks
// for afsluttede opgaver (tilmeldte ser dog altid egne).
export function CompletedTasksPage() {
    const { t } = useTranslation(['tasks', 'common'])

    const { hasPrivilege: canRead, isLoading: loadingRead } = useHasPrivilege(READ_TASKS_PRIVILEGE);
    const { hasPrivilege: canViewCompleted, isLoading: loadingCompleted } = useHasPrivilege(VIEW_COMPLETED_TASKS_PRIVILEGE);
    const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_TASKS_PRIVILEGE);
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_TASKS_PRIVILEGE);
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_TASKS_PRIVILEGE);

    const { data: rooms = [], isLoading: roomsLoading, error: roomsError } = useGetRoomsQuery(undefined, {
        skip: !canRead,
    });

    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);

    if (loadingRead || loadingCompleted || roomsLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="font-semibold">{t('page.loading')}</p>
            </div>
        );
    }

    if (!canRead || !canViewCompleted) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                <p className="text-secondary dark:text-slate-400">{t('completed.noAccess')}</p>
            </div>
        );
    }

    const pageError = readableError(roomsError);

    return (
        <div className="flex flex-col bg-white text-primary dark:bg-slate-900 dark:text-slate-100">

            {/* ROOM BAR - rum-klik navigerer til /tasks med rummet valgt */}
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
                    <h1 className="text-2xl sm:text-3xl font-bold break-words text-primary dark:text-slate-100">{t('completed.heading')}</h1>
                    <p className="text-secondary mt-1 dark:text-slate-400">{t('completed.subtitle')}</p>
                </div>

                <CompletedTasksPanel />
            </div>
        </div>
    );
}
