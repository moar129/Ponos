// src/utils/organisationExitMessage.ts
import { asDynamic } from '../i18n/config'
import type { Organisation } from '../types/organisation/organisationType'

/**
 * Beskeden efter at have forladt eller slettet en organisation: navnet,
 * og - hvis det var den aktive - hvilken organisation der nu er aktiv.
 * `keyPrefix` peger på tre nøgler: <prefix>, <prefix>NewActive og
 * <prefix>NoActive (fx organisation:admin.deleted*).
 */
export function organisationExitMessage(
    t: unknown,
    keyPrefix: 'organisation:admin.deleted' | 'organisation:myOrganisations.left',
    name: string,
    wasActive: boolean,
    newActive: Organisation | null,
): string {
    const tr = asDynamic(t)
    if (!wasActive) return tr(keyPrefix, { name })
    if (newActive) return tr(`${keyPrefix}NewActive`, { name, newActive: newActive.name })
    return tr(`${keyPrefix}NoActive`, { name })
}
