import type { ReactNode } from 'react'
import type { DevelopmentComparison } from '../../utils/statisticsSnapshot'
import type {
    ApprovalStatistics,
    CategoryCount,
    LossCounts,
    SnapshotSaveRequest,
    SnapshotViewPeriod,
    StatisticsAttention,
    StatisticsGranularity,
    StatisticsPeriodType,
    StatisticsQuarter,
    StatisticsSnapshot,
    TaskDevelopmentPoint,
    TaskRoomCount,
    TaskStatusCount,
} from './statisticsTypes'

export interface KpiTrend {
    direction: 'up' | 'down' | 'flat'
    /** Whether this direction is good, bad or neither for this figure. */
    tone: 'good' | 'bad' | 'neutral'
    /** Full sentence, e.g. "↑ 40 % vs. forrige periode". */
    text: string
}

export interface KPICardProps {
    title: string
    value?: number | string | null
    /** Small neutral line under the value, e.g. "8 af 10 med slutdato". */
    detail?: string
    /** Tooltip on the card, e.g. the total behind the figure. */
    hint?: string
    /** Change against the previous period (US-48 trend). */
    trend?: KpiTrend
    icon?: ReactNode
    unit?: string
    loading?: boolean
}

export interface ChartCardProps {
    title: string
    description?: string
    children?: ReactNode
    loading?: boolean
    /** Translated error message; replaces the content when set. */
    error?: string | null
    /** Shows the shared empty state instead of the content. */
    empty?: boolean
    /** Replaces the default empty text, e.g. why there is no data. */
    emptyMessage?: string
}

export interface StatisticsSectionProps {
    title: string
    children: ReactNode
}

export interface BarListRow {
    key: string
    label: string
    value: number
    /** Text shown at the bar tip; defaults to the formatted value. */
    valueLabel?: string
}

export interface BarListProps {
    rows: BarListRow[]
    /** Accessible name for the list, usually the card title. */
    ariaLabel: string
}

export interface TaskDevelopmentChartProps {
    data: TaskDevelopmentPoint[]
    granularity: StatisticsGranularity
}

export interface TaskDistributionChartProps {
    data: TaskStatusCount[]
}

export interface RoomScorecardProps {
    data: TaskRoomCount[]
    /** Sets the room filter; not offered for "Uden rum". */
    onSelectRoom: (roomId: string) => void
}

/** One sentence of the period summary (utils/statisticsInsights.ts). */
export interface StatisticsInsight {
    key: string
    /** Higher = more important; the top few are shown. */
    weight: number
    tone: 'good' | 'bad' | 'neutral'
    text: string
}

export interface InsightSummaryProps {
    insights: StatisticsInsight[]
    /** Period (and room) the sentences describe. */
    subtitle: string
    loading: boolean
}

export interface LossCardProps {
    loss: LossCounts & { byCategory: CategoryCount[] }
    previousLoss: LossCounts | null
    /** Compact previous period, e.g. "1.–30. aug.". */
    previousPeriod: string
    /** Set when filtered to a category (the bars are then subcategories). */
    categoryName: string | null
}

export interface AttentionPanelProps {
    data: StatisticsAttention
    /** Set when the room filter is active (task figures follow it, stock does not). */
    roomName: string | null
    /** Set when the category filter is active (stock follows it). */
    categoryName: string | null
}

export interface ApprovalChartProps {
    data: ApprovalStatistics
}

export interface StatisticsPeriodPickerProps {
    periodType: StatisticsPeriodType
    /** The selected quarter; null unless periodType is 'quarter'. */
    quarter: StatisticsQuarter | null
    /** Start of today (local) - quarters after it cannot be chosen. */
    today: Date
    onChangePeriod: (type: Exclude<StatisticsPeriodType, 'quarter' | 'custom'>) => void
    onChangeQuarter: (quarter: StatisticsQuarter) => void
    onOpenCustom: () => void
    /** Extra filters shown under the period buttons (the room filter). */
    children?: ReactNode
}

export interface StatisticsSelectFilterProps {
    /** Element id, links the label to the select. */
    id: string
    label: string
    /** Text of the "no filter" option. */
    allLabel: string
    options: { id: string; label: string }[]
    /** null = no filter */
    value: string | null
    onChange: (value: string | null) => void
}

export interface CustomPeriodModalProps {
    isOpen: boolean
    initialStart: Date | null
    initialEnd: Date | null
    onApply: (start: Date, end: Date) => void
    onClose: () => void
}

export interface SnapshotPanelProps {
    /** The overview's current period, offered as "Som visningen" when saving. */
    viewPeriod: SnapshotViewPeriod
    timeZone: string
}

export interface SaveSnapshotModalProps {
    isOpen: boolean
    viewPeriod: SnapshotViewPeriod
    isSaving: boolean
    error: string | null
    onSave: (request: SnapshotSaveRequest) => void
    onClose: () => void
}

export interface SnapshotComparisonTableProps {
    /** Oldest first; the first one is the baseline for the change. */
    snapshots: StatisticsSnapshot[]
}

export interface SnapshotDevelopmentChartProps {
    comparison: DevelopmentComparison
    /** Snapshot names in column order (oldest first). */
    names: string[]
}
