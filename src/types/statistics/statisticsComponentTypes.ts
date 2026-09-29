import type { ReactNode } from 'react'
import type {
    ApprovalStatistics,
    SnapshotGranularity,
    StatisticsGranularity,
    StatisticsPeriodType,
    StatisticsSnapshot,
    TaskDevelopmentPoint,
    TaskRoomCount,
    TaskStatusCount,
} from './statisticsTypes'

export interface KPICardProps {
    title: string
    value?: number | string | null
    /** Secondary line under the value, e.g. "18 med opgaveaktivitet". */
    subtitle?: string
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

export interface TaskRoomChartProps {
    data: TaskRoomCount[]
}

export interface ApprovalChartProps {
    data: ApprovalStatistics
}

export interface StatisticsPeriodPickerProps {
    periodType: StatisticsPeriodType
    onChangePeriod: (type: Exclude<StatisticsPeriodType, 'custom'>) => void
    onOpenCustom: () => void
}

export interface CustomPeriodModalProps {
    isOpen: boolean
    initialStart: Date | null
    initialEnd: Date | null
    onApply: (start: Date, end: Date) => void
    onClose: () => void
}

export interface SnapshotPanelProps {
    /** Current period, used when saving a new snapshot. */
    periodStart: string | null
    periodEnd: string | null
    periodLabel: string
    /** Length of the period in days; null = "Alt". Picks the default resolution. */
    periodDays: number | null
    timeZone: string
}

export interface SaveSnapshotModalProps {
    isOpen: boolean
    periodLabel: string
    defaultGranularity: SnapshotGranularity
    isSaving: boolean
    error: string | null
    onSave: (label: string, granularity: SnapshotGranularity) => void
    onClose: () => void
}

export interface SnapshotComparisonTableProps {
    snapshots: StatisticsSnapshot[]
}
