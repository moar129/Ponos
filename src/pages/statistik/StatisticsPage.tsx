// src/pages/statistik/StatisticsPage.tsx

import { useState } from 'react'
import {
    BarChart3,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ListTodo,
    TriangleAlert,
    Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { KPICard } from '../../components/statistics/KPICard'
import { ChartCard } from '../../components/statistics/ChartCard'
import { StatisticsStates } from '../../components/statistics/StatisticsStates'
import { useStatisticsPeriod } from '../../store/hooks/useStatisticsPeriod'
import { useStatisticsDataset } from '../../store/hooks/useStatisticsDataset'

export default function StatisticsPage() {
    const { t } = useTranslation('dashboard')
    const { data: profile, isLoading } = useGetMyProfileQuery()

    const {
        current,
        all,
        changePeriod,
        setCustomDates,
    } = useStatisticsPeriod()

    const {
        datasets,
        selectedDataset,
        selectedDatasetId,
        selectDataset,
    } = useStatisticsDataset()

    const [isCustomOpen, setIsCustomOpen] = useState(false)
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    if (isLoading) {
        return (
            <p className="text-secondary dark:text-slate-400">
                {t('statistics.loading')}
            </p>
        )
    }

    if (!profile?.activeOrganisationId) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100">
                <div className="rounded-md border border-border-gray dark:border-slate-700 p-5 text-center">
                    <p className="text-secondary dark:text-slate-400 mb-3">
                        {t('statistics.noOrganisation')}
                    </p>

                    <Link
                        to="/dashboard?tab=organisation"
                        className="inline-flex items-center gap-2 text-accent font-medium hover:underline"
                    >
                        <Building2 className="w-4 h-4" />
                        {t('statistics.goToOrganisation')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-primary dark:text-slate-100 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-secondary dark:text-slate-400" />

                    <div>
                        <h1 className="text-xl font-semibold text-primary dark:text-slate-100">
                            {t('statistics.title')}
                        </h1>

                        <p className="text-sm text-secondary dark:text-slate-400">
                            Statistik for {current.label.toLowerCase()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Dataset / år */}
            <div className="rounded-lg border border-border-gray dark:border-slate-700 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <h2 className="text-sm font-semibold text-primary dark:text-slate-100">
                            År
                        </h2>

                        <p className="mt-1 text-xs text-secondary dark:text-slate-400">
                            Vælg hvilket statistiksæt der skal vises.
                        </p>
                    </div>

                    <select
                        value={selectedDatasetId ?? ''}
                        onChange={(event) => {
                            if (event.target.value) {
                                selectDataset(event.target.value)
                            }
                        }}
                        disabled={datasets.length === 0}
                        className="rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                        <option value="">
                            {datasets.length === 0
                                ? 'Ingen datasæt tilgængelige'
                                : 'Vælg år'}
                        </option>

                        {datasets.map((dataset) => (
                            <option
                                key={dataset.id}
                                value={dataset.id}
                            >
                                {dataset.label}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedDataset && (
                    <p className="mt-3 text-xs text-secondary dark:text-slate-400">
                        Valgt datasæt: {selectedDataset.label}
                    </p>
                )}
            </div>

            {/* Period filter */}
            <div className="rounded-lg border border-border-gray dark:border-slate-700 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <h2 className="text-sm font-semibold text-primary dark:text-slate-100">
                            Statistikperiode
                        </h2>

                        <p className="text-xs text-secondary dark:text-slate-400 mt-1">
                            Vælg hvor stor en periode statistikken skal vise.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {all.map((period) => (
                            <button
                                key={period.type}
                                type="button"
                                onClick={() => {
                                    if (period.type === 'custom') {
                                        setIsCustomOpen(true)
                                        return
                                    }

                                    changePeriod(period.type)
                                }}
                                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${current.type === period.type
                                    ? 'bg-primary text-white'
                                    : 'bg-bg-gray text-secondary hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom period modal */}
            {isCustomOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsCustomOpen(false)
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800">

                        <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-secondary dark:text-slate-400" />

                            <div>
                                <h2 className="font-semibold text-primary dark:text-slate-100">
                                    Brugerdefineret periode
                                </h2>

                                <p className="text-sm text-secondary dark:text-slate-400">
                                    Vælg start- og slutdato.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            {/* Startdato */}
                            <div>
                                <label
                                    htmlFor="statistics-custom-start"
                                    className="mb-1 block text-sm font-medium text-primary dark:text-slate-200"
                                >
                                    Fra
                                </label>

                                <input
                                    id="statistics-custom-start"
                                    type="date"
                                    value={customStart}
                                    onChange={(event) =>
                                        setCustomStart(event.target.value)
                                    }
                                    className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                />
                            </div>

                            {/* Slutdato */}
                            <div>
                                <label
                                    htmlFor="statistics-custom-end"
                                    className="mb-1 block text-sm font-medium text-primary dark:text-slate-200"
                                >
                                    Til
                                </label>

                                <input
                                    id="statistics-custom-end"
                                    type="date"
                                    value={customEnd}
                                    min={customStart || undefined}
                                    onChange={(event) =>
                                        setCustomEnd(event.target.value)
                                    }
                                    className="w-full rounded-md border border-border-gray bg-white px-3 py-2 text-sm text-primary outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">

                            {/* Annuller */}
                            <button
                                type="button"
                                onClick={() => setIsCustomOpen(false)}
                                className="rounded-md px-4 py-2 text-sm font-medium text-secondary hover:bg-bg-gray dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Annuller
                            </button>

                            {/* Anvend */}
                            <button
                                type="button"
                                disabled={!customStart || !customEnd}
                                onClick={() => {
                                    const start = new Date(
                                        `${customStart}T00:00:00`
                                    )

                                    const end = new Date(
                                        `${customEnd}T00:00:00`
                                    )

                                    if (end < start) {
                                        return
                                    }

                                    setCustomDates(start, end)
                                    setIsCustomOpen(false)
                                }}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Anvend
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI cards */}
            <section>
                <div className="mb-3">
                    <h2 className="text-base font-semibold text-primary dark:text-slate-100">
                        Nøgletal
                    </h2>

                    <p className="text-sm text-secondary dark:text-slate-400">
                        Centrale tal for den valgte periode.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

                    <KPICard
                        title="Oprettede opgaver"
                        icon={<ListTodo className="h-5 w-5" />}
                    />

                    <KPICard
                        title="Færdige opgaver"
                        icon={<CheckCircle2 className="h-5 w-5" />}
                    />

                    <KPICard
                        title="Igangværende opgaver"
                        icon={<Clock3 className="h-5 w-5" />}
                    />

                    <KPICard
                        title="Forfaldne opgaver"
                        icon={<TriangleAlert className="h-5 w-5" />}
                    />

                    <KPICard
                        title="Aktive medarbejdere"
                        icon={<Users className="h-5 w-5" />}
                    />

                </div>
            </section>

            {/* Chart placeholders */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                <ChartCard
                    title="Opgaveudvikling"
                    description="Udviklingen i opgaver over den valgte periode."
                />

                <ChartCard
                    title="Arbejdsfordeling"
                    description="Fordelingen af arbejdet i organisationen."
                />

            </section>

            {/* Data state */}
            <StatisticsStates />

        </div>
    )
}