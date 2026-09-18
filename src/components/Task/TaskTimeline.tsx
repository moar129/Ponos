import type { ETaskStatus } from '../../types/Task/Task';

interface TaskTimelineProps {
    status: ETaskStatus;
    createdAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
}

export function TaskTimeline({
    status,
    createdAt,
    startedAt,
    finishedAt,
    
}: TaskTimelineProps) {
    const formatDate = (date: string | null | undefined) => {
        if (!date) return '';

        return new Date(date).toLocaleDateString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const isStarted =
        status === 'InProgress' || status === 'Completed';

    const isCompleted = status === 'Completed';

    return (
        <div className="w-full py-2">
            {/* TIMELINE */}
            <div className="flex items-center">
                {/* OPRETTET */}
                <div
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${'border-accent bg-accent'
                        }`}
                />

                <div
                    className={`h-0.5 flex-1 ${isStarted
                            ? 'bg-accent'
                            : 'bg-border-gray dark:bg-slate-600'
                        }`}
                />

                {/* I GANG */}
                <div
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${isStarted
                            ? 'border-accent bg-accent'
                            : 'border-border-gray bg-white dark:border-slate-600 dark:bg-slate-800'
                        }`}
                />

                <div
                    className={`h-0.5 flex-1 ${isCompleted
                            ? 'bg-accent'
                            : 'bg-border-gray dark:bg-slate-600'
                        }`}
                />

                {/* FÆRDIG */}
                <div
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${isCompleted
                            ? 'border-accent bg-accent'
                            : 'border-border-gray bg-white dark:border-slate-600 dark:bg-slate-800'
                        }`}
                />
            </div>

            {/* LABELS */}
            <div className="mt-2 grid grid-cols-3 text-xs">
                <div className="text-left">
                    <p className="font-semibold text-primary dark:text-slate-100">
                        Oprettet
                    </p>

                    <p className="text-secondary dark:text-slate-400">
                        {formatDate(createdAt)}
                    </p>
                </div>

                <div className="text-center">
                    <p
                        className={`font-semibold ${isStarted
                                ? 'text-primary dark:text-slate-100'
                                : 'text-secondary dark:text-slate-400'
                            }`}
                    >
                        I gang
                    </p>

                    {startedAt && (
                        <p className="text-secondary dark:text-slate-400">
                            {formatDate(startedAt)}
                        </p>
                    )}
                </div>

                <div className="text-right">
                    <p
                        className={`font-semibold ${isCompleted
                                ? 'text-primary dark:text-slate-100'
                                : 'text-secondary dark:text-slate-400'
                            }`}
                    >
                        Færdig
                    </p>

                    {finishedAt && (
                        <p className="text-secondary dark:text-slate-400">
                            {formatDate(finishedAt)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}