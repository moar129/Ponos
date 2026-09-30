// src/store/hooks/useTaskPermissions.ts
import {
    ASSIGN_TASKS_PRIVILEGE,
    CREATE_TASKS_PRIVILEGE,
    DELETE_TASKS_PRIVILEGE,
    READ_TASKS_PRIVILEGE,
    UPDATE_TASKS_PRIVILEGE,
    useHasPrivilege,
} from '../apis/privilegeApi'

// Opgave-privilegierne samlet - hver side under /tasks skal bruge de
// samme fem. Kun til at vise/skjule UI; RLS håndhæver dem.
export function useTaskPermissions() {
    const { hasPrivilege: canRead, isLoading } = useHasPrivilege(READ_TASKS_PRIVILEGE)
    const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_TASKS_PRIVILEGE)
    const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_TASKS_PRIVILEGE)
    const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_TASKS_PRIVILEGE)
    const { hasPrivilege: canAssign } = useHasPrivilege(ASSIGN_TASKS_PRIVILEGE)

    return { canRead, canCreate, canUpdate, canDelete, canAssign, isLoading }
}
