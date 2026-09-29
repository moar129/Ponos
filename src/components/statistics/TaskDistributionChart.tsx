import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts'

export interface TaskDistributionChartData {
    name: string
    value: number
}

interface TaskDistributionChartProps {
    data: TaskDistributionChartData[]
}

const chartColors = ['#94A3B8', '#C7975D', '#0B132A']

export function TaskDistributionChart({
    data,
}: TaskDistributionChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    if (total === 0) {
        return (
            <div className="flex min-h-[220px] items-center justify-center">
                <p className="text-sm text-secondary dark:text-slate-400">
                    Ingen opgaver i den valgte periode
                </p>
            </div>
        )
    }

    return (
        <div className="flex min-h-[220px] items-center gap-6">
            <div className="h-[220px] min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={2}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${entry.name}`}
                                    fill={
                                        chartColors[
                                            index % chartColors.length
                                        ]
                                    }
                                />
                            ))}
                        </Pie>

                        <Tooltip
                            formatter={(value) => [
                                value,
                                'Opgaver',
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="w-36 shrink-0 space-y-3">
                {data.map((item, index) => (
                    <div
                        key={item.name}
                        className="flex items-center justify-between gap-3"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                    backgroundColor:
                                        chartColors[
                                            index % chartColors.length
                                        ],
                                }}
                            />

                            <span className="truncate text-sm text-secondary dark:text-slate-300">
                                {item.name}
                            </span>
                        </div>

                        <span className="text-sm font-semibold text-primary dark:text-slate-100">
                            {item.value}
                        </span>
                    </div>
                ))}

                <div className="border-t border-border-gray pt-3 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary dark:text-slate-400">
                            I alt
                        </span>

                        <span className="text-sm font-semibold text-primary dark:text-slate-100">
                            {total}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}