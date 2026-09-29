// Types for the statistics page (US-48–54). All values are computed
// server-side by the get_statistics RPC (docs/migrations/2026-09-29-statistics.sql)
// and only ever contain aggregates - never rows or member names.

import type { ItemStatus } from '../dataLayer/datalayerTypes'
import type { ETaskPriority, ETaskStatus } from '../Task/Task'

/** Period picker options. Labels live in statistics:period.<type>. */
export type StatisticsPeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'max' | 'custom'

/** Postgres date_trunc unit used for the time series buckets. */
export type StatisticsGranularity = 'hour' | 'day' | 'week' | 'month'

export type MemberLoadBucket = '0' | '1-3' | '4-6' | '7+'

/** RPC arguments. start/end are ISO instants, end exclusive; null = unbounded ("Alt"). */
export interface StatisticsQueryArgs {
    start: string | null
    end: string | null
    granularity: StatisticsGranularity
    tz: string
}

export interface StatisticsKpis {
    created: number
    completed: number
    active: number
    overdue: number
    members: number
    membersWithTaskActivity: number
}

export interface TaskStatusCount {
    status: ETaskStatus
    count: number
}

export interface TaskPriorityCount {
    /** null = task has no priority */
    priority: ETaskPriority | null
    count: number
}

export interface TaskRoomCount {
    /** null = task has no room */
    roomId: string | null
    name: string | null
    total: number
    completed: number
    open: number
}

export interface MemberLoadCount {
    bucket: MemberLoadBucket
    count: number
}

export interface TaskDevelopmentPoint {
    /** Local bucket start, 'YYYY-MM-DDTHH:mm' */
    bucket: string
    created: number
    completed: number
}

export interface ApprovalStatistics {
    pending: number
    accepted: number
    rejected: number
    /** accepted / (accepted + rejected) in percent, null when nothing is decided */
    rate: number | null
    medianHours: number | null
}

export interface ItemStatusCount {
    status: ItemStatus
    count: number
}

export interface CategoryCount {
    categoryId: string
    title: string
    count: number
}

export interface TopMaterial {
    itemId: string
    name: string
    unit: string
    quantity: number
}

export interface StatisticsResult {
    kpis: StatisticsKpis
    taskStatus: TaskStatusCount[]
    taskPriority: TaskPriorityCount[]
    taskRooms: TaskRoomCount[]
    memberLoad: MemberLoadCount[]
    taskDevelopment: TaskDevelopmentPoint[]
    approvals: ApprovalStatistics
    materials: {
        byStatus: ItemStatusCount[]
        byCategory: CategoryCount[]
        topUsed: TopMaterial[]
    }
}

// --------------------------------------------------
// Snapshots (US-52/54)
// --------------------------------------------------

/**
 * Flattened value names written by save_statistics_snapshot: either a
 * scalar KPI or "<group>:<key>" (e.g. task_status:Completed, room:Sanitet,
 * room: = no room).
 */
export type StatisticsScalarName =
    | 'tasks_created'
    | 'tasks_completed'
    | 'tasks_active'
    | 'tasks_overdue'
    | 'members'
    | 'members_with_task_activity'
    | 'approvals_rate'
    | 'approvals_median_hours'

export type StatisticsValueGroup =
    | 'task_status'
    | 'task_priority'
    | 'room'
    | 'member_load'
    | 'approvals'
    | 'item_status'
    | 'category'
    | 'top_material'
    | 'development'

export type StatisticsValueName = StatisticsScalarName | `${StatisticsValueGroup}:${string}`

export interface StatisticsValue {
    name: StatisticsValueName
    value: number
    /** Sub-period of a time series row (development:*); null = the whole snapshot period. */
    periodStart: string | null
    periodEnd: string | null
}

/** Time series resolution chosen when a snapshot is saved. */
export type SnapshotGranularity = 'week' | 'month' | 'quarter'

export interface StatisticsSnapshot {
    id: string
    label: string | null
    periodStart: string
    periodEnd: string
    createdAt: string
    /** Resolution of the time series; null for snapshots saved before it was stored. */
    seriesGranularity: SnapshotGranularity | null
    values: StatisticsValue[]
}

export interface SaveStatisticsSnapshotArgs {
    start: string | null
    end: string | null
    label: string
    tz: string
    granularity: SnapshotGranularity
}
