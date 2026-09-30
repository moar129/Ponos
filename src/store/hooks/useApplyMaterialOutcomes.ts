// src/store/hooks/useApplyMaterialOutcomes.ts
import { useReleaseItemUnitsMutation } from '../apis/categoryApi'
import { useResolveTaskMaterialUnitsMutation } from '../apis/taskApi'
import type { MaterialOutcomeEntry } from '../../types/Task/Task'

// Anvender de udfald brugeren har valgt i ResolveTaskMaterialsModal - én
// linje ad gangen. release = "Frigiv" (materialet slippes fra opgaven),
// resolve = afrapportering ved færdiggørelse. Fejl kastes videre, så
// modalen selv viser dem.
export function useApplyMaterialOutcomes(taskId: string) {
    const [releaseItemUnits] = useReleaseItemUnitsMutation()
    const [resolveTaskMaterialUnits] = useResolveTaskMaterialUnitsMutation()

    return {
        release: async (entries: MaterialOutcomeEntry[]) => {
            for (const { taskMaterialId, itemId, outcomes } of entries) {
                await releaseItemUnits({ taskMaterialId, itemId, taskId, outcomes }).unwrap()
            }
        },
        resolve: async (entries: MaterialOutcomeEntry[]) => {
            for (const { taskMaterialId, itemId, outcomes } of entries) {
                await resolveTaskMaterialUnits({ taskMaterialId, itemId, taskId, outcomes }).unwrap()
            }
        },
    }
}
