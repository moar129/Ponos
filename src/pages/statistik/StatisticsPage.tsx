import { useState } from 'react'
import {
    BarChart3,
    Building2,
    Camera,
    CheckCircle2,
    Clock3,
    ListTodo,
    Lock,
    Target,
    Timer,
    TriangleAlert,
    Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../ErrorMessage'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { READ_STATISTICS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { useGetStatisticsQuery } from '../../store/apis/statisticApi'
import { useStatisticsPeriod } from '../../store/hooks/useStatisticsPeriod'
import { ApprovalChart } from '../../components/statistics/ApprovalChart'
import { AttentionPanel } from '../../components/statistics/AttentionPanel'
import { BarList } from '../../components/statistics/BarList'
import { ChartCard } from '../../components/statistics/ChartCard'
import { CustomPeriodModal } from '../../components/statistics/CustomPeriodModal'
import { KPICard } from '../../components/statistics/KPICard'
import { RoomScorecard } from '../../components/statistics/RoomScorecard'
import { SnapshotPanel } from '../../components/statistics/SnapshotPanel'
import { StatisticsPeriodPicker } from '../../components/statistics/StatisticsPeriodPicker'
import { StatisticsRoomFilter } from '../../components/statistics/StatisticsRoomFilter'
import { StatisticsSection } from '../../components/statistics/StatisticsSection'
import { TaskDevelopmentChart } from '../../components/statistics/TaskDevelopmentChart'
import { TaskDistributionChart } from '../../components/statistics/TaskDistributionChart'
import { kpiTrend } from '../../utils/statisticsTrend'
import type { KpiGoodDirection } from '../../utils/statisticsTrend'
import type { StatisticsKpis, StatisticsTab } from '../../types/statistics/statisticsTypes'

const CARD = 'rounded-lg bg-white p-4 text-primary shadow-md dark:bg-slate-800 dark:text-slate-100 sm:p-6 lg:p-8'

const TABS: { key: StatisticsTab; icon: typeof BarChart3 }[] = [
    { key: 'overblik', icon: BarChart3 },
    { key: 'snapshots', icon: Camera },
]

export default function StatisticsPage() {
    const { t, i18n } = useTranslation(['statistics', 'tasks', 'datalayer'])
    const { data: profile, isLoading: isProfileLoading } = useGetMyProfileQuery()
    const { hasPrivilege: canRead, isLoading: isPrivilegeLoading } = useHasPrivilege(READ_STATISTICS_PRIVILEGE)
    const { periodType, range, apiArgs, changePeriod, setCustomDates } = useStatisticsPeriod()
    const [isCustomOpen, setIsCustomOpen] = useState(false)
    // US-55: null = all rooms.
    const [roomId, setRoomId] = useState<string | null>(null)

    // Same ?tab= pattern as the dashboard. Snapshots live in their own tab,
    // independent of the overview's period filter (which stays in this page,
    // so "Som visningen" in the save dialog still knows it).
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab: StatisticsTab = searchParams.get('tab') === 'snapshots' ? 'snapshots' : 'overblik'

    const hasOrganisation = Boolean(profile?.activeOrganisationId)

    // currentData is undefined while a new period is fetched, so an old
    // period's numbers are never shown under a new period's label.
    // refetchOnFocus: other users' changes show up when returning to the tab.
    // `data` (last result) keeps the room list while a new filter loads.
    const { currentData: stats, data: lastStats, isFetching, error } = useGetStatisticsQuery({ ...apiArgs, roomId }, {
        skip: !hasOrganisation || !canRead || activeTab !== 'overblik',
        refetchOnMountOrArgChange: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    })

    if (isProfileLoading || (hasOrganisation && isPrivilegeLoading)) {
        return <p className="text-secondary dark:text-slate-400">{t('loading')}</p>
    }

    if (!hasOrganisation) {
        return (
            <div className={CARD}>
                <div className="rounded-md border border-border-gray p-5 text-center dark:border-slate-700">
                    <p className="mb-3 text-secondary dark:text-slate-400">{t('noOrganisation')}</p>
                    <Link
                        to="/dashboard?tab=organisation"
                        className="inline-flex items-center gap-2 font-medium text-accent hover:underline"
                    >
                        <Building2 className="h-4 w-4" />
                        {t('goToOrganisation')}
                    </Link>
                </div>
            </div>
        )
    }

    if (!canRead) {
        return (
            <div className={CARD}>
                <div className="flex items-center justify-center gap-2 rounded-md border border-border-gray p-5 text-center dark:border-slate-700">
                    <Lock className="h-4 w-4 shrink-0 text-secondary dark:text-slate-400" />
                    <p className="text-secondary dark:text-slate-400">{t('noAccess')}</p>
                </div>
            </div>
        )
    }

    const loading = isFetching && !stats
    const errorMessage = error ? getErrorMessage(error, t('loadFailed')) : null

    const dateFormat = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
    const formatRange = (start: Date, end: Date) =>
        start.getTime() === end.getTime()
            ? dateFormat.format(start)
            : t('period.range', { start: dateFormat.format(start), end: dateFormat.format(end) })
    const rangeLabel = range ? formatRange(range.start, range.end) : t('period.allTime')
    const periodLabel = periodType === 'custom' ? rangeLabel : `${t(`period.${periodType}`)} (${rangeLabel})`

    const kpis = stats?.kpis
    const previousKpis = stats?.previousKpis ?? null

    // The same-length period right before the selected one (inclusive dates),
    // named compactly ("1.–30. aug.") on each KPI card.
    const previousRange = range && previousKpis
        ? (() => {
            const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1
            const day = (offset: number) =>
                new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate() + offset)
            return { start: day(-days), end: day(-1) }
        })()
        : null
    const previousRangeShort = previousRange
        ? new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            ...(previousRange.start.getFullYear() !== previousRange.end.getFullYear() && { year: 'numeric' }),
        }).formatRange(previousRange.start, previousRange.end)
        : ''
    const materials = stats?.materials
    const rooms = lastStats?.rooms ?? []
    const roomName = roomId ? rooms.find((room) => room.id === roomId)?.name ?? null : null

    const decimal = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
    const formatPercent = (value: number) => `${decimal.format(value)} %`
    const formatDays = (days: number) => t('approvals.days', { count: days, formatted: decimal.format(days) })

    // Trend against the same-length period right before (none for "Alt", nor
    // when either side has no value, e.g. no deadlines). Percent figures move
    // in percentage points.
    const trendFor = (
        key: keyof StatisticsKpis,
        goodWhen: KpiGoodDirection,
        format: (value: number) => string = String,
        pointsSuffix?: string,
    ) => {
        const current = kpis?.[key]
        const previous = previousKpis?.[key]
        if (current === null || current === undefined || previous === null || previous === undefined) return undefined

        const previousText = format(previous)
        return kpiTrend(
            current,
            previous,
            goodWhen,
            i18n.language,
            (change) => t('kpi.trend', { change, previous: previousText, period: previousRangeShort }),
            t('kpi.trendSame', { previous: previousText, period: previousRangeShort }),
            pointsSuffix,
        )
    }

    // A room in the scorecard sets the filter; back to the top so the
    // changed header and filter are in view.
    const selectRoom = (id: string) => {
        setRoomId(id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

    const priorityRows = [...(stats?.taskPriority ?? [])]
        .reverse()
        .sort((a, b) => Number(a.priority === null) - Number(b.priority === null))
        .map((row) => ({
            key: row.priority ?? 'none',
            label: row.priority ? t(`tasks:priority.${row.priority}`) : t('priority.none'),
            value: row.count,
        }))

    const memberLoadRows = (stats?.memberLoad ?? []).map((row) => ({
        key: row.bucket,
        label: t(`memberLoad.bucket.${row.bucket}`),
        value: row.count,
    }))

    const materialStatusRows = (materials?.byStatus ?? [])
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((row) => ({ key: row.status, label: t(`datalayer:status.${row.status}`), value: row.count }))

    const categoryRows = (materials?.byCategory ?? []).map((row) => ({
        key: row.categoryId,
        label: row.title,
        value: row.count,
    }))

    const usedCategoryRows = (materials?.usedByCategory ?? []).map((row) => ({
        key: row.categoryId,
        label: row.title,
        value: row.count,
    }))

    // Stock status is read from the history at the period's end; before the
    // history starts it is unknown (byStatus = null).
    const statusAsOf = materials ? dateFormat.format(new Date(materials.statusAsOf)) : ''
    const statusUnknown = Boolean(materials && materials.byStatus === null)
    const historyStart = materials?.historyStart ? dateFormat.format(new Date(materials.historyStart)) : ''

    const topMaterialRows = (materials?.topUsed ?? []).map((row) => ({
        key: row.itemId,
        label: row.name,
        value: row.quantity,
        valueLabel: `${row.quantity.toLocaleString(i18n.language)} ${row.unit}`,
    }))

    const approvals = stats?.approvals
    const approvalTotal = approvals ? approvals.accepted + approvals.pending + approvals.rejected : 0

    return (
        <div className={`space-y-8 ${CARD}`}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 shrink-0 text-secondary dark:text-slate-400" />
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-primary dark:text-slate-100">{t('title')}</h1>
                    <p className="text-sm text-secondary dark:text-slate-400">
                        {activeTab === 'overblik'
                            ? roomName ? t('filter.forRoom', { room: roomName, period: periodLabel }) : periodLabel
                            : t('subtitle')}
                    </p>
                </div>
            </div>

            {/* Faner - scroller vandret på smalle skærme, som på dashboardet. */}
            <div role="tablist" className="no-scrollbar -mt-2 flex gap-1 overflow-x-auto border-b border-border-gray sm:gap-2 dark:border-slate-700">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        onClick={() => setSearchParams({ tab: tab.key })}
                        className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${activeTab === tab.key
                            ? 'border-accent text-accent'
                            : 'border-transparent text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {t(`tabs.${tab.key}`)}
                    </button>
                ))}
            </div>

            {activeTab === 'overblik' && (
                <>
                    <StatisticsPeriodPicker
                        periodType={periodType}
                        onChangePeriod={changePeriod}
                        onOpenCustom={() => setIsCustomOpen(true)}
                    >
                        <StatisticsRoomFilter rooms={rooms} roomId={roomId} onChange={setRoomId} />
                    </StatisticsPeriodPicker>

                    {isCustomOpen && (
                        <CustomPeriodModal
                            isOpen={isCustomOpen}
                            initialStart={periodType === 'custom' ? range?.start ?? null : null}
                            initialEnd={periodType === 'custom' ? range?.end ?? null : null}
                            onApply={(start, end) => {
                                setCustomDates(start, end)
                                setIsCustomOpen(false)
                            }}
                            onClose={() => setIsCustomOpen(false)}
                        />
                    )}

                    {errorMessage && (
                        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                            {errorMessage}
                        </p>
                    )}

                    {stats && <AttentionPanel data={stats.attention} roomName={roomName} />}

                    {/* KPI'er */}
                    <section className="space-y-3">
                        <div>
                            <h2 className="text-base font-semibold text-primary dark:text-slate-100">{t('kpi.heading')}</h2>
                            <p className="text-sm text-secondary dark:text-slate-400">{t('kpi.description')}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[2200px]:grid-cols-7">
                            <KPICard title={t('kpi.created')} icon={<ListTodo className="h-5 w-5" />} value={kpis?.created} trend={trendFor('created', null)} loading={loading} />
                            <KPICard title={t('kpi.completed')} icon={<CheckCircle2 className="h-5 w-5" />} value={kpis?.completed} trend={trendFor('completed', 'up')} loading={loading} />
                            <KPICard
                                title={t('kpi.onTime')}
                                icon={<Target className="h-5 w-5" />}
                                value={kpis?.onTimeRate === null || kpis?.onTimeRate === undefined ? null : formatPercent(kpis.onTimeRate)}
                                detail={kpis && (kpis.completedWithDeadline > 0
                                    ? t('kpi.onTimeDetail', { onTime: kpis.completedOnTime, total: kpis.completedWithDeadline })
                                    : t('kpi.onTimeNone'))}
                                trend={trendFor('onTimeRate', 'up', formatPercent, t('snapshots.pointsSuffix'))}
                                loading={loading}
                            />
                            <KPICard
                                title={t('kpi.leadTime')}
                                icon={<Timer className="h-5 w-5" />}
                                value={kpis?.medianLeadDays === null || kpis?.medianLeadDays === undefined ? null : formatDays(kpis.medianLeadDays)}
                                detail={t('kpi.leadTimeDetail')}
                                trend={trendFor('medianLeadDays', 'down', formatDays)}
                                loading={loading}
                            />
                            <KPICard title={t('kpi.active')} icon={<Clock3 className="h-5 w-5" />} value={kpis?.active} trend={trendFor('active', null)} loading={loading} />
                            <KPICard title={t('kpi.overdue')} icon={<TriangleAlert className="h-5 w-5" />} value={kpis?.overdue} trend={trendFor('overdue', 'down')} loading={loading} />
                            <KPICard
                                title={t('kpi.membersWithActivity')}
                                icon={<Users className="h-5 w-5" />}
                                value={kpis?.membersWithTaskActivity}
                                trend={trendFor('membersWithTaskActivity', null)}
                                loading={loading}
                            />
                        </div>
                    </section>

                    <StatisticsSection title={t('sections.tasks')}>
                        <ChartCard
                            title={t('development.title')}
                            description={t('development.description')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats?.taskDevelopment.every((point) => point.created === 0 && point.completed === 0)}
                        >
                            {stats && <TaskDevelopmentChart data={stats.taskDevelopment} granularity={apiArgs.granularity} />}
                        </ChartCard>

                        <ChartCard
                            title={t('status.title')}
                            description={t('status.description')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? sum(stats.taskStatus.map((row) => row.count)) === 0 : false}
                        >
                            {stats && <TaskDistributionChart data={stats.taskStatus} />}
                        </ChartCard>

                        <ChartCard
                            title={t('priority.title')}
                            description={t('priority.description')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? sum(priorityRows.map((row) => row.value)) === 0 : false}
                        >
                            <BarList rows={priorityRows} ariaLabel={t('priority.title')} />
                        </ChartCard>

                        {/* Per-room split makes no sense once filtered to one room. */}
                        {!roomId && (
                            <ChartCard
                                title={t('rooms.title')}
                                description={t('rooms.description')}
                                loading={loading}
                                error={errorMessage}
                                empty={stats ? sum(stats.taskRooms.map((room) => room.total + room.completed + room.overdue)) === 0 : false}
                            >
                                {stats && <RoomScorecard data={stats.taskRooms} onSelectRoom={selectRoom} />}
                            </ChartCard>
                        )}
                    </StatisticsSection>

                    <StatisticsSection title={t('sections.team')}>
                        <ChartCard
                            title={t('memberLoad.title')}
                            description={t('memberLoad.description')}
                            loading={loading}
                            error={errorMessage}
                            empty={kpis?.members === 0}
                        >
                            <BarList rows={memberLoadRows} ariaLabel={t('memberLoad.title')} />
                        </ChartCard>

                        <ChartCard
                            title={t('approvals.title')}
                            description={t('approvals.description')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? approvalTotal === 0 : false}
                        >
                            {approvals && <ApprovalChart data={approvals} />}
                        </ChartCard>
                    </StatisticsSection>

                    <StatisticsSection title={t('sections.materials')}>
                        <ChartCard
                            title={t('materials.statusTitle')}
                            description={[
                                statusAsOf ? t('materials.statusDescriptionAt', { date: statusAsOf }) : '',
                                roomId ? t('filter.wholeOrganisation') : '',
                            ].filter(Boolean).join(' ') || undefined}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? materialStatusRows.length === 0 : false}
                            emptyMessage={statusUnknown ? t('materials.noHistory', { date: historyStart }) : undefined}
                        >
                            <BarList rows={materialStatusRows} ariaLabel={t('materials.statusTitle')} />
                        </ChartCard>

                        <ChartCard
                            title={t('materials.categoryTitle')}
                            description={roomId ? `${t('materials.categoryDescription')} ${t('filter.wholeOrganisation')}` : t('materials.categoryDescription')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? categoryRows.length === 0 : false}
                        >
                            <BarList rows={categoryRows} ariaLabel={t('materials.categoryTitle')} />
                        </ChartCard>

                        <ChartCard
                            title={t('materials.usedCategoryTitle')}
                            description={t('materials.usedCategoryDescription')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? sum(usedCategoryRows.map((row) => row.value)) === 0 : false}
                        >
                            <BarList rows={usedCategoryRows} ariaLabel={t('materials.usedCategoryTitle')} />
                        </ChartCard>

                        <ChartCard
                            title={t('materials.topTitle')}
                            description={t('materials.topDescription')}
                            loading={loading}
                            error={errorMessage}
                            empty={stats ? topMaterialRows.length === 0 : false}
                        >
                            <BarList rows={topMaterialRows} ariaLabel={t('materials.topTitle')} />
                        </ChartCard>
                    </StatisticsSection>
                </>
            )}

            {activeTab === 'snapshots' && (
                <SnapshotPanel
                    viewPeriod={{
                        start: apiArgs.start,
                        end: apiArgs.end,
                        days: range ? Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1 : null,
                        label: periodLabel,
                    }}
                    timeZone={apiArgs.tz}
                />
            )}
        </div>
    )
}
