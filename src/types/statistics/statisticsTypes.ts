// Types for the statistics page (US-48–54). All values are computed
// server-side by the get_statistics RPC (docs/dbSchema.sql §15.26)
// and only ever contain aggregates - never rows or member names.

import type { ItemStatus } from '../dataLayer/datalayerTypes'
import type { ETaskPriority, ETaskStatus } from '../Task/Task'

/** Tabs on /statistik (?tab=). Labels live in statistics:tabs.<tab>. */
export type StatisticsTab = 'overblik' | 'snapshots'

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
    /** US-55: only tasks in this room; stock/categories stay organisation-wide. */
    roomId?: string | null
}

export interface StatisticsRoom {
    id: string
    name: string
}

export interface StatisticsKpis {
    created: number
    completed: number
    active: number
    overdue: number
    members: number
    /** Memberships created in the period (current members; not room-filtered). */
    newMembers: number
    membersWithTaskActivity: number
    /** Completed in the period with an end date. */
    completedWithDeadline: number
    /** ...of those, finished by the end date (a date-only end date counts the whole day). */
    completedOnTime: number
    /** completedOnTime / completedWithDeadline in percent; null without deadlines. */
    onTimeRate: number | null
    /** Median days from created to finished, tasks completed in the period; null when none. */
    medianLeadDays: number | null
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

/** One room with the KPI definitions applied to it (room scorecard). */
export interface TaskRoomCount {
    /** null = task has no room */
    roomId: string | null
    name: string | null
    /** Created in the period. */
    total: number
    /** Completed in the period. */
    completed: number
    overdue: number
    completedWithDeadline: number
    completedOnTime: number
    onTimeRate: number | null
}

/** "Lige nu": current state, independent of the period (never saved in snapshots). */
export interface StatisticsAttention {
    /** Open overdue tasks per priority, only priorities with any (follows the room filter). */
    overdueByPriority: TaskPriorityCount[]
    /** Open tasks nobody is assigned to (follows the room filter). */
    unassigned: number
    /** Unit rows per problem status right now (whole organisation). */
    stockAlerts: ItemStatusCount[]
    /** Items with units, none of them Available (whole organisation). */
    itemsWithoutAvailable: number
    /** Pending membership requests / invitations (whole organisation). */
    pendingRequests: number
    pendingInvitations: number
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

export interface LocationCount {
    /** Top-level location (lager); sections count towards it. null = no location. */
    locationId: string | null
    name: string | null
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
    /** Same-length period right before; null for "Alt". */
    previousKpis: StatisticsKpis | null
    /** All the organisation's rooms, for the room filter. */
    rooms: StatisticsRoom[]
    taskStatus: TaskStatusCount[]
    taskPriority: TaskPriorityCount[]
    taskRooms: TaskRoomCount[]
    memberLoad: MemberLoadCount[]
    taskDevelopment: TaskDevelopmentPoint[]
    approvals: ApprovalStatistics
    attention: StatisticsAttention
    materials: {
        /** Unit rows per status at the end of the period; null = before the stock history starts. */
        byStatus: ItemStatusCount[] | null
        /** Unit rows per top-level location at the end of the period; null = before the stock history starts. */
        byLocation: LocationCount[] | null
        /** The instant byStatus/byLocation describe (period end, or now). */
        statusAsOf: string
        /** First entry in the stock history; null when the organisation has no units. */
        historyStart: string | null
        /** Items per main category right now. */
        byCategory: CategoryCount[]
        /** Distinct items used on tasks created in the period, per main category. */
        usedByCategory: CategoryCount[]
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
    | 'members_new'
    | 'approvals_rate'
    | 'approvals_median_hours'
    | 'tasks_completed_with_deadline'
    | 'tasks_completed_on_time'
    | 'tasks_on_time_rate'
    | 'tasks_median_lead_days'

export type StatisticsValueGroup =
    | 'task_status'
    | 'task_priority'
    | 'room'
    | 'room_completed'
    | 'room_overdue'
    | 'room_on_time_rate'
    | 'member_load'
    | 'approvals'
    | 'item_status'
    | 'location'
    | 'category'
    | 'top_material'
    | 'used_category'
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

/** Period options in the save dialog, independent of the overview filter. */
export type SnapshotPeriodType = 'year' | 'quarter' | 'month' | 'custom' | 'view'

export interface SnapshotPeriodChoice {
    type: SnapshotPeriodType
    year: number
    /** 1–4 */
    quarter: number
    /** 0–11 */
    month: number
    /** 'YYYY-MM-DD', custom only */
    from: string
    to: string
}

/** The overview's current period, offered as "Som visningen". */
export interface SnapshotViewPeriod {
    start: string | null
    end: string | null
    /** null = "Alt" */
    days: number | null
    label: string
}

/** What the save dialog hands back. */
export interface SnapshotSaveRequest {
    start: string | null
    end: string | null
    label: string
    granularity: SnapshotGranularity
}
