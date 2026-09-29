import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

// The period in the address (?periode=30d&fra=…&til=…), so a shared link
// opens the same view. Danish values, like ?tab=overblik.
const PERIOD_PARAM: Record<StatisticsPeriodType, string> = {
    day: 'dag',
    week: '7d',
    month: '30d',
    quarter: '91d',
    year: '365d',
    max: 'alt',
    custom: 'egen',
}
const DEFAULT_PERIOD: StatisticsPeriodType = 'week'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** 'YYYY-MM-DD' (local) <-> Date; null for anything that is not a real date. */
function formatParamDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseParamDate(value: string | null): Date | null {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return null
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return formatParamDate(date) === value ? date : null
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
    const [searchParams, setSearchParams] = useSearchParams()

    const requested = Object.entries(PERIOD_PARAM).find(([, param]) => param === searchParams.get('periode'))?.[0] as
        | StatisticsPeriodType
        | undefined
    const customStart = parseParamDate(searchParams.get('fra'))
    const customEnd = parseParamDate(searchParams.get('til'))
    const customValid = Boolean(customStart && customEnd && customStart <= customEnd)
    // Unknown values (or a custom period without valid dates) fall back to the default.
    const periodType: StatisticsPeriodType =
        !requested || (requested === 'custom' && !customValid) ? DEFAULT_PERIOD : requested
    const customStartTime = customStart?.getTime() ?? null
    const customEndTime = customEnd?.getTime() ?? null

    // "Today" as state, refreshed when the window regains focus - otherwise a
    // page left open past midnight keeps showing yesterday's rolling period
    // (and refetchOnFocus would refetch that stale range). Same value = no re-render.
    const [todayTime, setTodayTime] = useState(() => startOfDay(new Date()).getTime())
    useEffect(() => {
        const refresh = () => setTodayTime(startOfDay(new Date()).getTime())
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', refresh)
        return () => {
            window.removeEventListener('focus', refresh)
            document.removeEventListener('visibilitychange', refresh)
        }
    }, [])

    const range = useMemo<StatisticsDateRange | null>(() => {
        if (periodType === 'max') return null
        if (periodType === 'custom' && customStartTime !== null && customEndTime !== null) {
            return { start: new Date(customStartTime), end: new Date(customEndTime) }
        }

        const today = new Date(todayTime)
        const days = ROLLING_DAYS[periodType] ?? 1
        return { start: addDays(today, -(days - 1)), end: today }
    }, [periodType, customStartTime, customEndTime, todayTime])

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

    // Replace (not push) so the back button leaves the page instead of
    // stepping through every filter click. Other params (tab, rum …) stay.
    const updateParams = (patch: Record<string, string | null>) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current)
            for (const [key, value] of Object.entries(patch)) {
                if (value === null) next.delete(key)
                else next.set(key, value)
            }
            return next
        }, { replace: true })
    }

    const changePeriod = (type: Exclude<StatisticsPeriodType, 'custom'>) => {
        updateParams({ periode: type === DEFAULT_PERIOD ? null : PERIOD_PARAM[type], fra: null, til: null })
    }

    const setCustomDates = (start: Date, end: Date) => {
        updateParams({
            periode: PERIOD_PARAM.custom,
            fra: formatParamDate(startOfDay(start)),
            til: formatParamDate(startOfDay(end)),
        })
    }

    return {
        periodType,
        range,
        apiArgs,
        changePeriod,
        setCustomDates,
        /** Reads/writes one of the page's own filter params (rum, kategori). */
        filterParam: (key: 'rum' | 'kategori') => searchParams.get(key),
        setFilterParam: (key: 'rum' | 'kategori', value: string | null) => updateParams({ [key]: value }),
    }
}
