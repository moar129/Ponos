import { useMemo, useState } from 'react'
import type {
    StatisticsGranularity,
    StatisticsPeriodType,
    StatisticsQueryArgs,
} from '../../types/statistics/statisticsTypes'

export const STATISTICS_PERIOD_TYPES: StatisticsPeriodType[] = [
    'day',
    'week',
    'month',
    'quarter',
    'year',
    'max',
    'custom',
]

// Rolling periods ending today (inclusive), in days.
const ROLLING_DAYS: Partial<Record<StatisticsPeriodType, number>> = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 91,
    year: 365,
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// One source of truth for the time series resolution: 1 day -> hours,
// up to a month -> days, up to a quarter -> weeks, otherwise months.
function granularityFor(days: number | null): StatisticsGranularity {
    if (days === null) return 'month'
    if (days <= 1) return 'hour'
    if (days <= 31) return 'day'
    if (days <= 91) return 'week'
    return 'month'
}

/** Inclusive calendar dates of the selected period; null for "Alt". */
export interface StatisticsDateRange {
    start: Date
    end: Date
}

export function useStatisticsPeriod() {
    const [periodType, setPeriodType] = useState<StatisticsPeriodType>('week')
    const [customRange, setCustomRange] = useState<StatisticsDateRange | null>(null)

    const range = useMemo<StatisticsDateRange | null>(() => {
        if (periodType === 'max') return null
        if (periodType === 'custom') return customRange

        const today = startOfDay(new Date())
        const days = ROLLING_DAYS[periodType] ?? 1
        return { start: addDays(today, -(days - 1)), end: today }
    }, [periodType, customRange])

    const apiArgs = useMemo<StatisticsQueryArgs>(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

        if (!range) {
            return { start: null, end: null, granularity: granularityFor(null), tz }
        }

        // Local midnight -> ISO instant; end is exclusive (the day after).
        const days = Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1

        return {
            start: range.start.toISOString(),
            end: addDays(range.end, 1).toISOString(),
            granularity: granularityFor(days),
            tz,
        }
    }, [range])

    const changePeriod = (type: Exclude<StatisticsPeriodType, 'custom'>) => {
        setPeriodType(type)
    }

    const setCustomDates = (start: Date, end: Date) => {
        setCustomRange({ start: startOfDay(start), end: startOfDay(end) })
        setPeriodType('custom')
    }

    return {
        periodType,
        range,
        apiArgs,
        changePeriod,
        setCustomDates,
    }
}
