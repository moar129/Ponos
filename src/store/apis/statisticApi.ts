import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { StatisticsSnapshot } from '../../types/statistics/statisticsTypes'


export interface StatisticsPeriod {
    start: string
    end: string
}

export interface StatisticsTasks {
    completed: number
    total: number
    trend: number
}

export interface StatisticsTaskDistribution {
    name: string
    value: number
}

export interface StatisticsMaterials {
    available: number
    inUse: number
    total: number
}

export interface StatisticsTeamActivity {
    activeMembers: number
    total: number
}

export interface StatisticsApprovalStats {
    rate: number
    approved: number
    rejected: number
    pending: number
}

export interface StatisticsOverdue {
    count: number
}


async function getAuthenticatedOrganisationId(): Promise<string> {
    const { data: authData, error: authError } =
        await supabase.auth.getUser()

    if (authError || !authData.user) {
        throw new Error('errors:loginRequiredForAction')
    }

    const { data: profileData, error: profileError } =
        await supabase
            .from('profiles')
            .select('active_organisation_id')
            .eq('id', authData.user.id)
            .single()

    if (profileError || !profileData?.active_organisation_id) {
        throw new Error('errors:organisationLookupFailed')
    }

    return profileData.active_organisation_id
}


export const statisticsApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({

        getStatisticsSnapshots: builder.query<StatisticsSnapshot[], void>({
            queryFn: async () => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('statistics_snapshots')
                        .select('*')
                        .eq('organisation_id', organisationId)
                        .order('period_start', { ascending: false })

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    return {
                        data: (data ?? []).map((snapshot) => ({
                            id: snapshot.id,
                            organisation_id: snapshot.organisation_id,
                            period_start: snapshot.period_start,
                            period_end: snapshot.period_end,
                            created_at: snapshot.created_at,
                            values: [],
                        })),
                    }
                } catch (err: unknown) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : 'errors:generic'

                    return {
                        error: {
                            status: 'CUSTOM_ERROR',
                            error: message,
                        },
                    }
                }
            },
        }),

        getStatisticsSnapshot: builder.query<
            StatisticsSnapshot | null,
            StatisticsPeriod
        >({
            async queryFn() {
                return {
                    data: null,
                }
            },
        }),

        getTasks: builder.query<StatisticsTasks, StatisticsPeriod>({
            async queryFn() {
                return {
                    data: {
                        completed: 0,
                        total: 0,
                        trend: 0,
                    },
                }
            },
        }),

        getTaskDistribution: builder.query<
            StatisticsTaskDistribution[],
            StatisticsPeriod
        >({
            async queryFn() {
                return {
                    data: [],
                }
            },
        }),

        getMaterials: builder.query<StatisticsMaterials, StatisticsPeriod>({
            async queryFn() {
                return {
                    data: {
                        available: 0,
                        inUse: 0,
                        total: 0,
                    },
                }
            },
        }),

        getTeamActivity: builder.query<
            StatisticsTeamActivity,
            StatisticsPeriod
        >({
            async queryFn() {
                return {
                    data: {
                        activeMembers: 0,
                        total: 0,
                    },
                }
            },
        }),

        getApprovalStats: builder.query<
            StatisticsApprovalStats,
            StatisticsPeriod
        >({
            async queryFn() {
                return {
                    data: {
                        rate: 0,
                        approved: 0,
                        rejected: 0,
                        pending: 0,
                    },
                }
            },
        }),

        getOverdue: builder.query<StatisticsOverdue, StatisticsPeriod>({
            async queryFn() {
                return {
                    data: {
                        count: 0,
                    },
                }
            },
        }),
    }),
})


export const {
    useGetStatisticsSnapshotsQuery,
    useGetStatisticsSnapshotQuery,
    useGetTasksQuery,
    useGetTaskDistributionQuery,
    useGetMaterialsQuery,
    useGetTeamActivityQuery,
    useGetApprovalStatsQuery,
    useGetOverdueQuery,
} = statisticsApi