// src/components/Task/TaskPageShell.tsx
import { useTranslation } from 'react-i18next'
import { useTaskPermissions } from '../../store/hooks/useTaskPermissions'
import type { TaskPageShellProps } from '../../types/Task/Task'
import { Alert } from '../common/Alert'
import { RoomBar } from './RoomBar'

// Rammen om siderne under /tasks: indlæser/ingen adgang, RoomBar (rum-klik
// fra andre faner navigerer til /tasks med rummet valgt), fejl og
// overskrift.
export function TaskPageShell({
    isLoading,
    hasAccess,
    noAccessText,
    rooms,
    selectedRoomId = null,
    onSelectRoom = () => {},
    toolbar,
    error,
    heading,
    subtitle,
    actions,
    children,
}: TaskPageShellProps) {
    const { t } = useTranslation('tasks')
    const { canRead, canCreate, canUpdate, canDelete } = useTaskPermissions()

    if (isLoading || !hasAccess) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
                {isLoading
                    ? <p className="font-semibold">{t('page.loading')}</p>
                    : <p className="text-secondary dark:text-slate-400">{noAccessText}</p>}
            </div>
        )
    }

    return (
        <div className="flex flex-col bg-white text-primary dark:bg-slate-900 dark:text-slate-100">
            {rooms && (
                <RoomBar
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={onSelectRoom}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    canFavorite={canRead}
                />
            )}

            {toolbar}

            <div className="flex-1 w-full py-4 sm:py-8 lg:px-2">
                <Alert className="mb-4">{error}</Alert>

                <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-2xl sm:text-3xl font-bold break-words text-primary dark:text-slate-100">
                            {heading}
                        </div>
                        <p className="text-secondary mt-1 dark:text-slate-400">{subtitle}</p>
                    </div>

                    {actions}
                </div>

                {children}
            </div>
        </div>
    )
}
