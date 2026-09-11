// src/store/apis/supabaseApi.ts
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'

export const supabaseApi = createApi({
    reducerPath: 'supabaseApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: [
        'Session',
        'Profile',
        'PendingRequest',
        'MembershipRequest',
        'MembershipInvitation',
        'Membership',
        'Privilege',
        'Role',
        'Organisation',
        'Category',
        'Item',
        'ItemLocation',
        'Task',
        'TaskRoom',
        'MyTasks',
        'News',
        'NewsSource'
    ],
    endpoints: () => ({}),
})

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
    'ItemLocation',
    'Task',
    'TaskRoom',
    'MyTasks',
    'News',
    'NewsSource',
] as const