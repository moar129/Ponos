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
        'Privilege',
        'Category',
        'Item',
        'ItemLocation',
    ],
    endpoints: () => ({}),
})