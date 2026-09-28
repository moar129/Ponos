import { useCallback, useMemo, useState } from 'react';

const labels: Record<StatisticsPeriodType, string> = {
    dag: 'Dag',
    uge: '7 dage',
    måned: '30 dage',
    kvartal: '91 dage',
    år: '365 dage',
    max: 'Alt',
    custom: 'Brugerdefineret',
};

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

    const getDateWithoutTime = useCallback((date: Date) => {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }, []);

    const getEndOfDay = useCallback((date: Date) => {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23,
            59,
            59,
            999
        );
    }, []);

    const getRollingStart = useCallback(
        (date: Date, days: number) => {
            const result = getDateWithoutTime(date);
            result.setDate(result.getDate() - (days - 1));

            return result;
        },
        [getDateWithoutTime]
    );

    const getPeriodDates = useCallback(
        (
            type: StatisticsPeriodType
        ): { start: Date | null; end: Date | null } => {
            const today = getDateWithoutTime(new Date());

            switch (type) {
                case 'dag':
                    return {
                        start: today,
                        end: getEndOfDay(today),
                    };

                case 'uge':
                    return {
                        start: getRollingStart(today, 7),
                        end: getEndOfDay(today),
                    };

                case 'måned':
                    return {
                        start: getRollingStart(today, 30),
                        end: getEndOfDay(today),
                    };

                case 'kvartal':
                    return {
                        start: getRollingStart(today, 91),
                        end: getEndOfDay(today),
                    };

                case 'år':
                    return {
                        start: getRollingStart(today, 365),
                        end: getEndOfDay(today),
                    };

                case 'max':
                    return {
                        start: null,
                        end: null,
                    };

                case 'custom':
                    return {
                        start: customStart,
                        end: customEnd
                            ? getEndOfDay(customEnd)
                            : null,
                    };

                default:
                    return {
                        start: null,
                        end: null,
                    };
            }
        },
        [
            customStart,
            customEnd,
            getDateWithoutTime,
            getEndOfDay,
            getRollingStart,
        ]
    );


    const current = useMemo<StatisticsPeriod>(() => {
        const dates = getPeriodDates(periodType);

        return {
            type: periodType,
            label: labels[periodType],
            start: dates.start,
            end: dates.end,
        };
    }, [periodType, getPeriodDates]);

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
                label: labels[type],
                start: dates.start,
                end: dates.end,
            };
        });
    }, [getPeriodDates]);

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