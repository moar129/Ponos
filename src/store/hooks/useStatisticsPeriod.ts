import { useMemo, useState } from 'react';

export type StatisticsPeriodType =
    | 'dag'
    | 'uge'
    | 'måned'
    | 'kvartal'
    | 'år'
    | 'max'
    | 'custom';

export type StatisticsGranularity =
    | 'time'
    | 'dag'
    | 'uge'
    | 'måned';

export interface StatisticsPeriod {
    type: StatisticsPeriodType;
    label: string;
    start: Date | null;
    end: Date | null;
}

interface SqlDateRange {
    start: string;
    end: string;
}

export function useStatisticsPeriod() {
    const [periodType, setPeriodType] =
        useState<StatisticsPeriodType>('uge');

    const [customStart, setCustomStart] = useState<Date | null>(null);
    const [customEnd, setCustomEnd] = useState<Date | null>(null);

    const getDateWithoutTime = (date: Date) => {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    };

    const getStartOfWeek = (date: Date) => {
        const result = getDateWithoutTime(date);
        const day = result.getDay();

        const difference = day === 0 ? -6 : 1 - day;

        result.setDate(result.getDate() + difference);

        return result;
    };

    const getStartOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    };

    const getStartOfQuarter = (date: Date) => {
        const quarterMonth = Math.floor(date.getMonth() / 3) * 3;

        return new Date(date.getFullYear(), quarterMonth, 1);
    };

    const getStartOfYear = (date: Date) => {
        return new Date(date.getFullYear(), 0, 1);
    };

    const getEndOfDay = (date: Date) => {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23,
            59,
            59,
            999
        );
    };

    const getEndOfPeriod = (start: Date, type: StatisticsPeriodType) => {
        const end = new Date(start);

        switch (type) {
            case 'dag':
                return getEndOfDay(end);

            case 'uge':
                end.setDate(end.getDate() + 6);
                return getEndOfDay(end);

            case 'måned':
                end.setMonth(end.getMonth() + 1, 0);
                return getEndOfDay(end);

            case 'kvartal':
                end.setMonth(end.getMonth() + 3, 0);
                return getEndOfDay(end);

            case 'år':
                end.setFullYear(end.getFullYear() + 1, 0, 0);
                return getEndOfDay(end);

            case 'max':
                return null;

            case 'custom':
                return customEnd ? getEndOfDay(customEnd) : null;

            default:
                return null;
        }
    };

    const getPeriodDates = (
        type: StatisticsPeriodType
    ): { start: Date | null; end: Date | null } => {
        const today = getDateWithoutTime(new Date());

        switch (type) {
            case 'dag': {
                return {
                    start: today,
                    end: getEndOfDay(today),
                };
            }

            case 'uge': {
                const start = getStartOfWeek(today);

                return {
                    start,
                    end: getEndOfPeriod(start, 'uge'),
                };
            }

            case 'måned': {
                const start = getStartOfMonth(today);

                return {
                    start,
                    end: getEndOfPeriod(start, 'måned'),
                };
            }

            case 'kvartal': {
                const start = getStartOfQuarter(today);

                return {
                    start,
                    end: getEndOfPeriod(start, 'kvartal'),
                };
            }

            case 'år': {
                const start = getStartOfYear(today);

                return {
                    start,
                    end: getEndOfPeriod(start, 'år'),
                };
            }

            case 'max':
                return {
                    start: null,
                    end: null,
                };

            case 'custom':
                return {
                    start: customStart,
                    end: customEnd,
                };

            default:
                return {
                    start: null,
                    end: null,
                };
        }
    };

    const current = useMemo<StatisticsPeriod>(() => {
        const dates = getPeriodDates(periodType);

        const labels: Record<StatisticsPeriodType, string> = {
            dag: 'Dag',
            uge: 'Uge',
            måned: 'Måned',
            kvartal: 'Kvartal',
            år: 'År',
            max: 'Max',
            custom: 'Custom',
        };

        return {
            type: periodType,
            label: labels[periodType],
            start: dates.start,
            end: dates.end,
        };
    }, [periodType, customStart, customEnd]);

    const all = useMemo<StatisticsPeriod[]>(() => {
        const types: StatisticsPeriodType[] = [
            'dag',
            'uge',
            'måned',
            'kvartal',
            'år',
            'max',
            'custom',
        ];

        return types.map((type) => {
            const dates = getPeriodDates(type);

            return {
                type,
                label: {
                    dag: 'Dag',
                    uge: 'Uge',
                    måned: 'Måned',
                    kvartal: 'Kvartal',
                    år: 'År',
                    max: 'Max',
                    custom: 'Custom',
                }[type],
                start: dates.start,
                end: dates.end,
            };
        });
    }, [customStart, customEnd]);

    const changePeriod = (type: StatisticsPeriodType) => {
        setPeriodType(type);
    };

    const setCustomDates = (start: Date, end: Date) => {
        setCustomStart(start);
        setCustomEnd(end);
        setPeriodType('custom');
    };

    const getSqlInterval = (): string | SqlDateRange | null => {
        if (periodType === 'max') {
            return null;
        }

        if (periodType === 'custom') {
            if (!customStart || !customEnd) {
                return null;
            }

            return {
                start: customStart.toISOString(),
                end: getEndOfDay(customEnd).toISOString(),
            };
        }

        return periodType;
    };

    const getGranularity = (): StatisticsGranularity => {
        switch (periodType) {
            case 'dag':
                return 'time';

            case 'uge':
            case 'måned':
                return 'dag';

            case 'kvartal':
                return 'uge';

            case 'år':
            case 'max':
                return 'måned';

            case 'custom': {
                if (!customStart || !customEnd) {
                    return 'dag';
                }

                const start = getDateWithoutTime(customStart);
                const end = getDateWithoutTime(customEnd);

                const difference =
                    end.getTime() - start.getTime();

                const days =
                    difference / (1000 * 60 * 60 * 24) + 1;

                if (days <= 30) {
                    return 'dag';
                }

                if (days <= 90) {
                    return 'uge';
                }

                return 'måned';
            }

            default:
                return 'dag';
        }
    };

    return {
        current,
        all,
        changePeriod,
        setCustomDates,
        getSqlInterval,
        getGranularity,
    };
}