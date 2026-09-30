import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
    StatisticsGranularity,
    StatisticsPeriodType,
    StatisticsQuarter,
    StatisticsQueryArgs,
} from '../../types/statistics/statisticsTypes'

/** Plain period buttons, in order. Kvartal, Alt and Brugerdefineret follow them. */
export const STATISTICS_PERIOD_TYPES: Exclude<StatisticsPeriodType, 'quarter' | 'max' | 'custom'>[] = [
    'day',
    'week',
    'month',
    'year',
]

/** How many years (incl. this one) the year dropdowns offer. */
export const STATISTICS_YEARS_BACK = 10

// The period in the address (?periode=maaned, ?periode=kvartal&kvartal=3&aar=2025,
// ?periode=egen&fra=…&til=…), so a shared link opens the same view. Danish values,
// like ?tab=overblik.
const PERIOD_PARAM: Record<StatisticsPeriodType, string> = {
    day: 'dag',
    week: 'uge',
    month: 'maaned',
    quarter: 'kvartal',
    year: 'aar',
    max: 'alt',
    custom: 'egen',
}
const DEFAULT_PERIOD: StatisticsPeriodType = 'month'

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

/** First day of the current calendar week (Monday), month or year containing `today`. */
function calendarStart(type: 'day' | 'week' | 'month' | 'year', today: Date): Date {
    switch (type) {
        case 'week':
            return addDays(today, -((today.getDay() + 6) % 7))
        case 'month':
            return new Date(today.getFullYear(), today.getMonth(), 1)
        case 'year':
            return new Date(today.getFullYear(), 0, 1)
        default:
            return today
    }
}

function quarterStart({ quarter, year }: StatisticsQuarter): Date {
    return new Date(year, (quarter - 1) * 3, 1)
}

/** The calendar quarter containing `date`. */
export function quarterFromDate(date: Date): StatisticsQuarter {
    return { quarter: Math.floor(date.getMonth() / 3) + 1, year: date.getFullYear() }
}

/** False for quarters that have not begun yet - they can only show zeros. */
export function isQuarterStarted(quarter: StatisticsQuarter, today: Date): boolean {
    return quarterStart(quarter) <= today
}

// One source of truth for the time series resolution: 1 day -> hours,
// up to a month -> days, up to a quarter (92 days) -> weeks, otherwise months.
function granularityFor(days: number | null): StatisticsGranularity {
    if (days === null) return 'month'
    if (days <= 1) return 'hour'
    if (days <= 31) return 'day'
    if (days <= 92) return 'week'
    return 'month'
}

/** Inclusive calendar dates of the selected period; null for "Alt". */
export interface StatisticsDateRange {
    start: Date
    end: Date
}

export function useStatisticsPeriod() {
    const [searchParams, setSearchParams] = useSearchParams()

    // "Today" as state, refreshed when the window regains focus - otherwise a
    // page left open past midnight keeps showing yesterday's period (and
    // refetchOnFocus would refetch that stale range). Same value = no re-render.
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

    const requested = Object.entries(PERIOD_PARAM).find(([, param]) => param === searchParams.get('periode'))?.[0] as
        | StatisticsPeriodType
        | undefined
    const customStart = parseParamDate(searchParams.get('fra'))
    const customEnd = parseParamDate(searchParams.get('til'))
    const customValid = Boolean(customStart && customEnd && customStart <= customEnd)

    // ?kvartal=1-4, ?aar defaults to this year.
    const quarterParam = Number(searchParams.get('kvartal'))
    const yearParam = searchParams.get('aar')
    const requestedQuarter: StatisticsQuarter | null =
        Number.isInteger(quarterParam) && quarterParam >= 1 && quarterParam <= 4
            ? { quarter: quarterParam, year: yearParam === null ? new Date(todayTime).getFullYear() : Number(yearParam) }
            : null
    const quarterValid = Boolean(
        requestedQuarter && Number.isInteger(requestedQuarter.year) && isQuarterStarted(requestedQuarter, new Date(todayTime)),
    )

    // Unknown values (incl. the old 7d/30d… links), a custom period without valid
    // dates or a quarter that has not begun fall back to the default.
    const periodType: StatisticsPeriodType =
        !requested || (requested === 'custom' && !customValid) || (requested === 'quarter' && !quarterValid)
            ? DEFAULT_PERIOD
            : requested
    const customStartTime = customStart?.getTime() ?? null
    const customEndTime = customEnd?.getTime() ?? null
    const quarter = periodType === 'quarter' ? requestedQuarter : null
    const quarterNumber = quarter?.quarter ?? null
    const quarterYear = quarter?.year ?? null

    const range = useMemo<StatisticsDateRange | null>(() => {
        if (periodType === 'max') return null
        if (periodType === 'custom' && customStartTime !== null && customEndTime !== null) {
            return { start: new Date(customStartTime), end: new Date(customEndTime) }
        }

        const today = new Date(todayTime)
        if (periodType === 'quarter' && quarterNumber !== null && quarterYear !== null) {
            // A finished quarter in full; the current one up to today.
            const start = quarterStart({ quarter: quarterNumber, year: quarterYear })
            const last = addDays(new Date(start.getFullYear(), start.getMonth() + 3, 1), -1)
            return { start, end: last < today ? last : today }
        }
        if (periodType === 'day' || periodType === 'week' || periodType === 'month' || periodType === 'year') {
            return { start: calendarStart(periodType, today), end: today }
        }
        return { start: today, end: today }
    }, [periodType, customStartTime, customEndTime, quarterNumber, quarterYear, todayTime])

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

    const changePeriod = (type: Exclude<StatisticsPeriodType, 'quarter' | 'custom'>) => {
        updateParams({
            periode: type === DEFAULT_PERIOD ? null : PERIOD_PARAM[type],
            fra: null,
            til: null,
            kvartal: null,
            aar: null,
        })
    }

    const changeQuarter = ({ quarter: nextQuarter, year }: StatisticsQuarter) => {
        updateParams({
            periode: PERIOD_PARAM.quarter,
            kvartal: String(nextQuarter),
            aar: year === new Date(todayTime).getFullYear() ? null : String(year),
            fra: null,
            til: null,
        })
    }

    const setCustomDates = (start: Date, end: Date) => {
        updateParams({
            periode: PERIOD_PARAM.custom,
            fra: formatParamDate(startOfDay(start)),
            til: formatParamDate(startOfDay(end)),
            kvartal: null,
            aar: null,
        })
    }

    return {
        periodType,
        range,
        apiArgs,
        /** The selected quarter; null unless periodType is 'quarter'. */
        quarter,
        today: new Date(todayTime),
        changePeriod,
        changeQuarter,
        setCustomDates,
        /** Reads/writes one of the page's own filter params (rum, kategori). */
        filterParam: (key: 'rum' | 'kategori') => searchParams.get(key),
        setFilterParam: (key: 'rum' | 'kategori', value: string | null) => updateParams({ [key]: value }),
    }
}
