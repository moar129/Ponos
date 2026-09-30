// src/utils/taskMaterials.ts
import type { DynamicTFunction } from '../i18n/config'
import type { TaskMaterialStatusGroup } from '../types/Task/Task'

/** "8 stk Tilgængelig, 1 stk Beskadiget" - en materiale-linjes status-fordeling. */
export function formatStatusGroups(groups: TaskMaterialStatusGroup[], unit: string, t: DynamicTFunction): string {
    return groups
        .map((group) => `${group.quantity} ${unit} ${t(`datalayer:status.${group.status}`)}`.replace(/\s+/g, ' '))
        .join(', ')
}

/** Lokationerne for en materiale-linjes enheder, plus "Uden lokation" hvis nogle mangler én. */
export function materialLocationLabels(
    material: { locationLabels: string[]; hasUnitsWithoutLocation: boolean },
    noLocationLabel: string,
): string[] {
    return [...material.locationLabels, ...(material.hasUnitsWithoutLocation ? [noLocationLabel] : [])]
}
