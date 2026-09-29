// src/store/apis/statisticApi.ts

import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import type { StatisticsSnapshot } from '../../types/statistics/statisticsTypes'

export interface StatisticsPeriod {
    start: string
    end: string
}

export interface StatisticsTasks {
    completed: number
    inProgress: number
    total: number
    trend: number
}

export interface StatisticsTaskDistribution {
    name: string
    value: number
}

export interface StatisticsTaskDevelopment {
    date: string
    created: number
    completed: number
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

/*
 * Perioderne fra StatisticsPage kommer som YYYY-MM-DD.
 *
 * Da vores databasefelter er timestamps, bruger vi:
 *
 * >= start
 * < dagen efter end
 *
 * Det betyder, at hele slutdatoen bliver inkluderet.
 */
function getNextDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number)

    const nextDay = new Date(year, month - 1, day)
    nextDay.setDate(nextDay.getDate() + 1)

    const nextYear = nextDay.getFullYear()
    const nextMonth = String(nextDay.getMonth() + 1).padStart(2, '0')
    const nextDate = String(nextDay.getDate()).padStart(2, '0')

    return `${nextYear}-${nextMonth}-${nextDate}`
}

/*
 * Lokal dagsdato i YYYY-MM-DD.
 *
 * Vi bruger ikke toISOString(), da den er UTC-baseret og
 * derfor kan give en forkert dato omkring midnat.
 */
function getToday(): string {
    const today = new Date()

    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function hasPeriod(period: StatisticsPeriod): boolean {
    return Boolean(period.start && period.end)
}

export const statisticsApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({

        // --------------------------------------------------
        // Statistics snapshots
        // --------------------------------------------------

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

        // --------------------------------------------------
        // KPI: Opgaver
        // --------------------------------------------------

        getStatisticsTasks: builder.query<StatisticsTasks, StatisticsPeriod>({
            queryFn: async (period) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    /*
                     * Vi henter de relevante datoer fra alle organisationens
                     * opgaver og beregner de tre KPI'er ud fra hvert sit
                     * korrekte datofelt.
                     *
                     * Oprettede:
                     *   created_at
                     *
                     * Færdige:
                     *   finished_at
                     *
                     * Igangværende:
                     *   start_date + status
                     */
                    const { data, error } = await supabase
                        .from('tasks')
                        .select(
                            'id, status, created_at, start_date, finished_at'
                        )
                        .eq('organisation_id', organisationId)

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    const tasks = data ?? []

                    let createdTasks = tasks
                    let completedTasks = tasks
                    let inProgressTasks = tasks

                    if (hasPeriod(period)) {
                        const periodEndExclusive = getNextDay(period.end)

                        /*
                         * Oprettede opgaver:
                         * Filtreres på created_at.
                         */
                        createdTasks = tasks.filter((task) => {
                            if (!task.created_at) {
                                return false
                            }

                            return (
                                task.created_at >= period.start &&
                                task.created_at < periodEndExclusive
                            )
                        })

                        /*
                         * Færdige opgaver:
                         * Filtreres på finished_at.
                         *
                         * Det betyder, at en opgave tæller som færdig
                         * i den periode, hvor den faktisk blev afsluttet.
                         */
                        completedTasks = tasks.filter((task) => {
                            if (!task.finished_at) {
                                return false
                            }

                            return (
                                task.finished_at >= period.start &&
                                task.finished_at < periodEndExclusive
                            )
                        })

                        /*
                         * Igangværende opgaver:
                         * Vi bruger start_date til at afgøre, hvilke
                         * opgaver der hører til perioden og status til
                         * at afgøre, om de stadig er igangværende.
                         */
                        inProgressTasks = tasks.filter((task) => {
                            if (
                                task.status !== 'InProgress' ||
                                !task.start_date
                            ) {
                                return false
                            }

                            return (
                                task.start_date >= period.start &&
                                task.start_date < periodEndExclusive
                            )
                        })
                    }

                    const completed = completedTasks.filter(
                        (task) => task.status === 'Completed'
                    ).length

                    const inProgress = inProgressTasks.length

                    const total = createdTasks.length

                    return {
                        data: {
                            completed,
                            inProgress,
                            total,
                            trend: 0,
                        },
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

        // --------------------------------------------------
        // KPI: Forfaldne opgaver
        // --------------------------------------------------

        getOverdue: builder.query<StatisticsOverdue, StatisticsPeriod>({
            queryFn: async (period) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    const today = getToday()

                    let query = supabase
                        .from('tasks')
                        .select('id, status, end_date')
                        .eq('organisation_id', organisationId)
                        .lt('end_date', today)
                        .neq('status', 'Completed')

                    /*
                     * Hvis der er valgt en periode, begrænser vi
                     * de forfaldne opgaver til opgaver, hvis
                     * end_date ligger i perioden.
                     */
                    if (hasPeriod(period)) {
                        const periodEndExclusive =
                            getNextDay(period.end)

                        query = query
                            .gte('end_date', period.start)
                            .lt('end_date', periodEndExclusive)
                    }

                    const { data, error } = await query

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    return {
                        data: {
                            count: data?.length ?? 0,
                        },
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

        // --------------------------------------------------
        // KPI: Aktive medarbejdere
        // --------------------------------------------------

        getTeamActivity: builder.query<
            StatisticsTeamActivity,
            StatisticsPeriod
        >({
            queryFn: async (period) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    let taskQuery = supabase
                        .from('tasks')
                        .select('id, start_date')
                        .eq('organisation_id', organisationId)

                    if (hasPeriod(period)) {
                        const periodEndExclusive =
                            getNextDay(period.end)

                        taskQuery = taskQuery
                            .gte('start_date', period.start)
                            .lt('start_date', periodEndExclusive)
                    }

                    const {
                        data: tasks,
                        error: taskError,
                    } = await taskQuery

                    if (taskError) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: taskError.message,
                            },
                        }
                    }

                    const taskIds = (tasks ?? []).map(
                        (task) => task.id
                    )

                    if (taskIds.length === 0) {
                        return {
                            data: {
                                activeMembers: 0,
                                total: 0,
                            },
                        }
                    }

                    const {
                        data: assignees,
                        error: assigneeError,
                    } = await supabase
                        .from('task_assignees')
                        .select('user_id')
                        .in('task_id', taskIds)

                    if (assigneeError) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: assigneeError.message,
                            },
                        }
                    }

                    const uniqueMembers = new Set(
                        (assignees ?? []).map(
                            (assignee) => assignee.user_id
                        )
                    )

                    return {
                        data: {
                            activeMembers: uniqueMembers.size,
                            total: uniqueMembers.size,
                        },
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

        // --------------------------------------------------
        // Task distribution
        // --------------------------------------------------

        getTaskDistribution: builder.query<
            StatisticsTaskDistribution[],
            StatisticsPeriod
        >({
            queryFn: async (period) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    let query = supabase
                        .from('tasks')
                        .select('id, status, created_at')
                        .eq('organisation_id', organisationId)

                    /*
                     * Fordelingen viser status på opgaver,
                     * der er oprettet i den valgte periode.
                     */
                    if (hasPeriod(period)) {
                        const periodEndExclusive =
                            getNextDay(period.end)

                        query = query
                            .gte('created_at', period.start)
                            .lt('created_at', periodEndExclusive)
                    }

                    const { data, error } = await query

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    const tasks = data ?? []

                    const started = tasks.filter(
                        (task) => task.status === 'Started'
                    ).length

                    const inProgress = tasks.filter(
                        (task) => task.status === 'InProgress'
                    ).length

                    const completed = tasks.filter(
                        (task) => task.status === 'Completed'
                    ).length

                    return {
                        data: [
                            {
                                name: 'Startet',
                                value: started,
                            },
                            {
                                name: 'Igangværende',
                                value: inProgress,
                            },
                            {
                                name: 'Færdige',
                                value: completed,
                            },
                        ],
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

        // --------------------------------------------------
        // Task development
        // --------------------------------------------------

        getTaskDevelopment: builder.query<
            StatisticsTaskDevelopment[],
            StatisticsPeriod
        >({
            queryFn: async (period) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('tasks')
                        .select(
                            'id, status, created_at, finished_at'
                        )
                        .eq('organisation_id', organisationId)

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    const tasks = data ?? []

                    /*
                     * Hvis der ikke er valgt en periode,
                     * bruger vi hele datasættet.
                     *
                     * Til selve grafen grupperer vi stadig
                     * efter måned, så "Alt" ikke bliver ét
                     * kæmpe datapunkt.
                     */
                    let startDate: Date
                    let endDate: Date

                    if (hasPeriod(period)) {
                        const [startYear, startMonth, startDay] =
                            period.start.split('-').map(Number)

                        const [endYear, endMonth, endDay] =
                            period.end.split('-').map(Number)

                        startDate = new Date(
                            startYear,
                            startMonth - 1,
                            startDay
                        )

                        endDate = new Date(
                            endYear,
                            endMonth - 1,
                            endDay
                        )
                    } else {
                        const dates = tasks
                            .flatMap((task) => [
                                task.created_at,
                                task.finished_at,
                            ])
                            .filter(
                                (date): date is string =>
                                    Boolean(date)
                            )
                            .map((date) => new Date(date))
                            .filter(
                                (date) =>
                                    !Number.isNaN(date.getTime())
                            )

                        if (dates.length === 0) {
                            return {
                                data: [],
                            }
                        }

                        startDate = new Date(
                            Math.min(
                                ...dates.map((date) =>
                                    date.getTime()
                                )
                            )
                        )

                        endDate = new Date(
                            Math.max(
                                ...dates.map((date) =>
                                    date.getTime()
                                )
                            )
                        )
                    }

                    /*
                     * Bestemmer hvor detaljeret grafen skal være.
                     *
                     * <= 1 dag  -> timer
                     * <= 30 dage -> dage
                     * <= 90 dage -> uger
                     * > 90 dage  -> måneder
                     */
                    const differenceInDays =
                        Math.ceil(
                            (endDate.getTime() -
                                startDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1

                    type Granularity =
                        | 'hour'
                        | 'day'
                        | 'week'
                        | 'month'

                    let granularity: Granularity

                    if (differenceInDays <= 1) {
                        granularity = 'hour'
                    } else if (differenceInDays <= 30) {
                        granularity = 'day'
                    } else if (differenceInDays <= 90) {
                        granularity = 'week'
                    } else {
                        granularity = 'month'
                    }

                    /*
                     * Opretter grafens tidsperioder.
                     */
                    interface Bucket {
                        key: string
                        date: Date
                        created: number
                        completed: number
                    }

                    const buckets = new Map<string, Bucket>()

                    const getBucketDate = (
                        date: Date
                    ): Date => {
                        const bucketDate = new Date(date)

                        if (granularity === 'hour') {
                            bucketDate.setMinutes(0, 0, 0)
                        }

                        if (granularity === 'day') {
                            bucketDate.setHours(0, 0, 0, 0)
                        }

                        if (granularity === 'week') {
                            bucketDate.setHours(0, 0, 0, 0)

                            const day =
                                bucketDate.getDay()

                            const difference =
                                day === 0 ? -6 : 1 - day

                            bucketDate.setDate(
                                bucketDate.getDate() +
                                difference
                            )
                        }

                        if (granularity === 'month') {
                            bucketDate.setDate(1)
                            bucketDate.setHours(0, 0, 0, 0)
                        }

                        return bucketDate
                    }

                    const getBucketKey = (
                        date: Date
                    ): string => {
                        const year =
                            date.getFullYear()

                        const month = String(
                            date.getMonth() + 1
                        ).padStart(2, '0')

                        const day = String(
                            date.getDate()
                        ).padStart(2, '0')

                        const hour = String(
                            date.getHours()
                        ).padStart(2, '0')

                        if (granularity === 'hour') {
                            return `${year}-${month}-${day}-${hour}`
                        }

                        if (granularity === 'day') {
                            return `${year}-${month}-${day}`
                        }

                        if (granularity === 'week') {
                            return `${year}-${month}-${day}`
                        }

                        return `${year}-${month}`
                    }

                    const addBucket = (
                        date: Date
                    ): Bucket => {
                        const bucketDate =
                            getBucketDate(date)

                        const key =
                            getBucketKey(bucketDate)

                        const existing =
                            buckets.get(key)

                        if (existing) {
                            return existing
                        }

                        const bucket: Bucket = {
                            key,
                            date: bucketDate,
                            created: 0,
                            completed: 0,
                        }

                        buckets.set(key, bucket)

                        return bucket
                    }

                    /*
                     * Oprette opgaver.
                     */
                    tasks.forEach((task) => {
                        if (!task.created_at) {
                            return
                        }

                        const createdDate =
                            new Date(task.created_at)

                        if (
                            Number.isNaN(
                                createdDate.getTime()
                            )
                        ) {
                            return
                        }

                        if (
                            hasPeriod(period) &&
                            (
                                createdDate <
                                startDate ||
                                createdDate >
                                new Date(
                                    endDate.getTime() +
                                    24 *
                                    60 *
                                    60 *
                                    1000 -
                                    1
                                )
                            )
                        ) {
                            return
                        }

                        const bucket =
                            addBucket(createdDate)

                        bucket.created += 1
                    })

                    /*
                     * Færdige opgaver.
                     *
                     * Vi bruger finished_at, så en opgave
                     * placeres i den periode, hvor den faktisk
                     * blev færdig.
                     */
                    tasks.forEach((task) => {
                        if (!task.finished_at) {
                            return
                        }

                        const completedDate =
                            new Date(task.finished_at)

                        if (
                            Number.isNaN(
                                completedDate.getTime()
                            )
                        ) {
                            return
                        }

                        if (
                            hasPeriod(period) &&
                            (
                                completedDate <
                                startDate ||
                                completedDate >
                                new Date(
                                    endDate.getTime() +
                                    24 *
                                    60 *
                                    60 *
                                    1000 -
                                    1
                                )
                            )
                        ) {
                            return
                        }

                        if (
                            task.status !== 'Completed'
                        ) {
                            return
                        }

                        const bucket =
                            addBucket(completedDate)

                        bucket.completed += 1
                    })

                    /*
                     * Sorterer datapunkterne kronologisk.
                     */
                    const result = Array.from(
                        buckets.values()
                    )
                        .sort(
                            (a, b) =>
                                a.date.getTime() -
                                b.date.getTime()
                        )
                        .map((bucket) => {
                            const year =
                                bucket.date.getFullYear()

                            const month = String(
                                bucket.date.getMonth() + 1
                            ).padStart(2, '0')

                            const day = String(
                                bucket.date.getDate()
                            ).padStart(2, '0')

                            const hour = String(
                                bucket.date.getHours()
                            ).padStart(2, '0')

                            let date = `${year}-${month}`

                            if (
                                granularity === 'day' ||
                                granularity === 'week'
                            ) {
                                date = `${year}-${month}-${day}`
                            }

                            if (
                                granularity === 'hour'
                            ) {
                                date = `${year}-${month}-${day} ${hour}:00`
                            }

                            return {
                                date,
                                created: bucket.created,
                                completed:
                                    bucket.completed,
                            }
                        })

                    return {
                        data: result,
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

        // --------------------------------------------------
        // Materials
        // --------------------------------------------------

        getMaterials: builder.query<
            StatisticsMaterials,
            StatisticsPeriod
        >({
            async queryFn() {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    const { data, error } = await supabase
                        .from('items')
                        .select('id')
                        .eq('organisation_id', organisationId)

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    const total = data?.length ?? 0

                    return {
                        data: {
                            available: total,
                            inUse: 0,
                            total,
                        },
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

        // --------------------------------------------------
        // Approval statistics
        // --------------------------------------------------

        getApprovalStats: builder.query<
            StatisticsApprovalStats,
            StatisticsPeriod
        >({
            queryFn: async (period) => {
                try {
                    const organisationId =
                        await getAuthenticatedOrganisationId()

                    let query = supabase
                        .from('tasks')
                        .select(
                            'id, status, requires_approval, created_at'
                        )
                        .eq('organisation_id', organisationId)

                    /*
                     * Approval-statistikken tager udgangspunkt i
                     * opgaver, der er oprettet i perioden.
                     */
                    if (hasPeriod(period)) {
                        const periodEndExclusive =
                            getNextDay(period.end)

                        query = query
                            .gte('created_at', period.start)
                            .lt('created_at', periodEndExclusive)
                    }

                    const { data, error } = await query

                    if (error) {
                        return {
                            error: {
                                status: 'CUSTOM_ERROR',
                                error: error.message,
                            },
                        }
                    }

                    const tasks = data ?? []

                    const approvalTasks = tasks.filter(
                        (task) =>
                            task.requires_approval === true
                    )

                    const approved = approvalTasks.filter(
                        (task) => task.status === 'Completed'
                    ).length

                    const pending = approvalTasks.filter(
                        (task) => task.status === 'InProgress'
                    ).length

                    /*
                     * Der findes endnu ikke et separat rejected-felt
                     * eller en rejected-status i den nuværende task-model.
                     */
                    const rejected = 0

                    const totalDecided =
                        approved + rejected

                    const rate =
                        totalDecided > 0
                            ? Math.round(
                                (approved / totalDecided) * 100
                            )
                            : 0

                    return {
                        data: {
                            rate,
                            approved,
                            rejected,
                            pending,
                        },
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
    }),
})

export const {
    useGetStatisticsSnapshotsQuery,
    useGetStatisticsSnapshotQuery,
    useGetStatisticsTasksQuery,
    useGetOverdueQuery,
    useGetTeamActivityQuery,
    useGetTaskDistributionQuery,
    useGetTaskDevelopmentQuery,
    useGetMaterialsQuery,
    useGetApprovalStatsQuery,
} = statisticsApi