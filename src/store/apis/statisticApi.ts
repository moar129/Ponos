// src/store/apis/statisticApi.ts
//
// Statistics (US-48–54). Everything is aggregated server-side by the
// get_statistics RPC (docs/dbSchema.sql §15.26): the
// organisation comes from auth_profile_org(), access requires
// read_statistics, and the numbers are the same for everyone with that
// privilege - independent of task RLS (completed tasks, role-locked rooms)
// and of PostgREST's 1000-row limit.

import { supabaseApi } from './supabaseApi'
import { supabase } from '../../lib/supabase'
import { errorCode, mapDbError } from './apiError'
import type {
    SaveStatisticsSnapshotArgs,
    SnapshotGranularity,
    StatisticsQueryArgs,
    StatisticsResult,
    StatisticsSnapshot,
    StatisticsValueName,
} from '../../types/statistics/statisticsTypes'

interface SnapshotValueRow {
    name: StatisticsValueName
    value: number
    period_start: string | null
    period_end: string | null
}

interface SnapshotRow {
    id: string
    label: string | null
    period_start: string
    period_end: string
    created_at: string
    series_granularity: SnapshotGranularity | null
    statistics_values: SnapshotValueRow[] | null
}

export const statisticsApi = supabaseApi.injectEndpoints({
    endpoints: (builder) => ({
        getStatistics: builder.query<StatisticsResult, StatisticsQueryArgs>({
            queryFn: async ({ start, end, granularity, tz, roomId, categoryId }) => {
                const { data, error } = await supabase.rpc('get_statistics', {
                    p_start: start,
                    p_end: end,
                    p_granularity: granularity,
                    p_tz: tz,
                    p_room_id: roomId ?? null,
                    p_category_id: categoryId ?? null,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: data as StatisticsResult }
            },
            providesTags: ['Statistics'],
        }),

        getStatisticsSnapshots: builder.query<StatisticsSnapshot[], void>({
            queryFn: async () => {
                // RLS scopes to the active organisation and requires read_statistics.
                const { data, error } = await supabase
                    .from('statistics_snapshots')
                    .select('id, label, period_start, period_end, created_at, series_granularity, statistics_values(name, value, period_start, period_end)')
                    .order('period_start', { ascending: false })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return {
                    data: ((data ?? []) as SnapshotRow[]).map((row) => ({
                        id: row.id,
                        label: row.label,
                        periodStart: row.period_start,
                        periodEnd: row.period_end,
                        createdAt: row.created_at,
                        seriesGranularity: row.series_granularity,
                        values: (row.statistics_values ?? []).map((value) => ({
                            name: value.name,
                            value: Number(value.value),
                            periodStart: value.period_start,
                            periodEnd: value.period_end,
                        })),
                    })),
                }
            },
            providesTags: ['StatisticsSnapshot'],
        }),

        saveStatisticsSnapshot: builder.mutation<string, SaveStatisticsSnapshotArgs>({
            queryFn: async ({ start, end, label, tz, granularity }) => {
                const { data, error } = await supabase.rpc('save_statistics_snapshot', {
                    p_start: start,
                    p_end: end,
                    p_label: label,
                    p_tz: tz,
                    p_granularity: granularity,
                })

                if (error) {
                    return { error: mapDbError(error) }
                }

                return { data: data as string }
            },
            invalidatesTags: ['StatisticsSnapshot'],
        }),

        deleteStatisticsSnapshot: builder.mutation<void, { id: string }>({
            queryFn: async ({ id }) => {
                // RLS silently deletes 0 rows without delete_statistics - select
                // the deleted ids so that case surfaces as an error.
                const { data, error } = await supabase
                    .from('statistics_snapshots')
                    .delete()
                    .eq('id', id)
                    .select('id')

                if (error) {
                    return { error: mapDbError(error) }
                }

                if (!data || data.length === 0) {
                    return { error: errorCode('permission.deleteStatistics') }
                }

                return { data: undefined }
            },
            invalidatesTags: ['StatisticsSnapshot'],
        }),
    }),
})

export const {
    useGetStatisticsQuery,
    useGetStatisticsSnapshotsQuery,
    useSaveStatisticsSnapshotMutation,
    useDeleteStatisticsSnapshotMutation,
} = statisticsApi
