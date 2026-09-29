import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

export interface TaskDevelopmentChartData {
    date: string
    created: number
    completed: number
}

interface TaskDevelopmentChartProps {
    data: TaskDevelopmentChartData[]
}

function formatDate(date: string): string {
    const parts = date.split('-')

    if (parts.length !== 3) {
        return date
    }

    return `${parts[2]}/${parts[1]}`
}

export function TaskDevelopmentChart({
    data,
}: TaskDevelopmentChartProps) {
    if (data.length === 0) {
        return (
            <div className="flex min-h-[220px] items-center justify-center">
                <p className="text-sm text-secondary dark:text-slate-400">
                    Ingen opgaver i den valgte periode
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-[220px] w-full">
            <ResponsiveContainer width="100%" height={220}>
                <LineChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border-gray dark:stroke-slate-700"
                    />

                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{
                            fontSize: 12,
                        }}
                        tickLine={false}
                        axisLine={false}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{
                            fontSize: 12,
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />

                    <Tooltip
                        formatter={(value, name) => [
                            value,
                            name === 'created'
                                ? 'Oprettede'
                                : 'Færdige',
                        ]}
                        labelFormatter={(label) =>
                            `Dato: ${formatDate(String(label))}`
                        }
                    />

                    <Line
                        type="monotone"
                        dataKey="created"
                        name="created"
                        stroke="#C7975D"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />

                    <Line
                        type="monotone"
                        dataKey="completed"
                        name="completed"
                        stroke="#0B132A"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            <div className="mt-2 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#C7975D]" />
                    <span className="text-xs text-secondary dark:text-slate-400">
                        Oprettede
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0B132A] dark:bg-slate-300" />
                    <span className="text-xs text-secondary dark:text-slate-400">
                        Færdige
                    </span>
                </div>
            </div>
        </div>
    )
}