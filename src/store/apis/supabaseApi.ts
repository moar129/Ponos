// src/store/apis/supabaseApi.ts
import { createApi, fakeBaseQuery, type TagDescription } from '@reduxjs/toolkit/query/react'

// Alle tags, der afhænger af "hvem er logget ind og hvilken organisation
// er aktiv" - skal invalideres samlet begge steder, hvor det kan ændre
// sig: ved login/logout (authApi.ts, anden bruger kan være logget ind)
// og ved skift af aktiv organisation (organisationApi.ts). Holdt som én
// liste netop for at undgå at de to steder langsomt driver fra hinanden,
// som det skete med US-59: 'Membership' blev tilføjet ved skift-aktiv-org,
// men authApi.ts's egen (dengang separate) liste blev ikke opdateret -
// resultat: korrekt rolle krævede en manuel F5 efter login som en anden
// bruger.
export const USER_SCOPED_TAGS = [
    'Profile',
    'Privilege',
    'Organisation',
    'Role',
    'Membership',
    'MembershipRequest',
    'MembershipInvitation',
    'PendingRequest',
    'Category',
    'Item',
    'ItemUnit',
    'ItemLocation',
    'DataLayerFavorite',
    'Task',
    'TaskRoom',
    'TaskRoomFavorite',
    'MyTasks',
    'News',
    'Conversation',
    'Message',
    'Notification',
    'NotificationPreference',
    'Statistics',
    'StatisticsSnapshot',
] as const

// Alle tags er bruger-afhængige undtagen selve sessionen.
const TAG_TYPES = ['Session', ...USER_SCOPED_TAGS] as const

export const supabaseApi = createApi({
    reducerPath: 'supabaseApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: TAG_TYPES,
    endpoints: () => ({}),
})

type TagType = (typeof TAG_TYPES)[number]
export type ApiTag = TagDescription<TagType>

/** Listen ('LIST') + ét tag pr. række, så både listen og den enkelte række kan invalideres. */
export function listTags(type: TagType, rows: readonly { id: string }[] | undefined): ApiTag[] {
    const list = { type, id: 'LIST' }
    return rows ? [list, ...rows.map((row) => ({ type, id: row.id }))] : [list]
}

// Opgave-tags med sammensatte id'er - samlet her, så en stavefejl i fx
// '-MATERIALS' ikke stille får en invalidering til at ramme ved siden af.
export const taskTags = {
    list: { type: 'Task', id: 'LIST' },
    pendingRequests: { type: 'Task', id: 'PENDING-REQUESTS' },
    one: (taskId: string): ApiTag => ({ type: 'Task', id: taskId }),
    assignees: (taskId: string): ApiTag => ({ type: 'Task', id: `${taskId}-ASSIGNEES` }),
    requests: (taskId: string): ApiTag => ({ type: 'Task', id: `${taskId}-REQUESTS` }),
    materials: (taskId: string): ApiTag => ({ type: 'Task', id: `${taskId}-MATERIALS` }),
} as const satisfies Record<string, ApiTag | ((taskId: string) => ApiTag)>

/** Enhederne på ét item (itemUnitApi/getItemUnits). */
export const itemUnitsTag = (itemId: string): ApiTag => ({ type: 'ItemUnit', id: `ITEM-${itemId}` })

/** Et items enheder, selve itemet og lagerlisten - efter enhver ændring af enheder. */
export const itemTags = (itemId: string): ApiTag[] => [
    itemUnitsTag(itemId),
    { type: 'Item', id: itemId },
    { type: 'Item', id: 'LIST' },
]

/**
 * Alt der skal genindlæses, når et materiale reserveres, frigives eller
 * afrapporteres: enhederne, itemet, lagerlisten og opgavens materialer.
 */
export const taskMaterialTags = (taskId: string, itemId: string): ApiTag[] => [
    ...itemTags(itemId),
    taskTags.one(taskId),
    taskTags.materials(taskId),
    taskTags.list,
]
