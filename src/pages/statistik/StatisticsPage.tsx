import { useState } from 'react'
import {
    BarChart3,
    Building2,
    CheckCircle2,
    Clock3,
    ListTodo,
    Lock,
    TriangleAlert,
    Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../ErrorMessage'
import { useGetMyProfileQuery } from '../../store/apis/profileApi'
import { READ_STATISTICS_PRIVILEGE, useHasPrivilege } from '../../store/apis/privilegeApi'
import { useGetStatisticsQuery } from '../../store/apis/statisticApi'
import { useStatisticsPeriod } from '../../store/hooks/useStatisticsPeriod'
import { ApprovalChart } from '../../components/statistics/ApprovalChart'
import { BarList } from '../../components/statistics/BarList'
import { ChartCard } from '../../components/statistics/ChartCard'
import { CustomPeriodModal } from '../../components/statistics/CustomPeriodModal'
import { KPICard } from '../../components/statistics/KPICard'
import { SnapshotPanel } from '../../components/statistics/SnapshotPanel'
import { StatisticsPeriodPicker } from '../../components/statistics/StatisticsPeriodPicker'
import { StatisticsSection } from '../../components/statistics/StatisticsSection'
import { TaskDevelopmentChart } from '../../components/statistics/TaskDevelopmentChart'
import { TaskDistributionChart } from '../../components/statistics/TaskDistributionChart'
import { TaskRoomChart } from '../../components/statistics/TaskRoomChart'

const CARD = 'rounded-lg bg-white p-4 text-primary shadow-md dark:bg-slate-800 dark:text-slate-100 sm:p-6 lg:p-8'

export default function StatisticsPage() {
    const { t, i18n } = useTranslation(['statistics', 'tasks', 'datalayer'])
    const { data: profile, isLoading: isProfileLoading } = useGetMyProfileQuery()
    const { hasPrivilege: canRead, isLoading: isPrivilegeLoading } = useHasPrivilege(READ_STATISTICS_PRIVILEGE)
    const { periodType, range, apiArgs, changePeriod, setCustomDates } = useStatisticsPeriod()
    const [isCustomOpen, setIsCustomOpen] = useState(false)

    const hasOrganisation = Boolean(profile?.activeOrganisationId)

    // currentData is undefined while a new period is fetched, so an old
    // period's numbers are never shown under a new period's label.
    const { currentData: stats, isFetching, error } = useGetStatisticsQuery(apiArgs, {
        skip: !hasOrganisation || !canRead,
        refetchOnMountOrArgChange: true,
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
    const rangeLabel = range
        ? range.start.getTime() === range.end.getTime()
            ? dateFormat.format(range.start)
            : t('period.range', { start: dateFormat.format(range.start), end: dateFormat.format(range.end) })
        : t('period.allTime')
    const periodLabel = periodType === 'custom' ? rangeLabel : `${t(`period.${periodType}`)} (${rangeLabel})`

    const kpis = stats?.kpis
    const materials = stats?.materials

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
                    <p className="text-sm text-secondary dark:text-slate-400">{periodLabel}</p>
                </div>
            </div>

            <StatisticsPeriodPicker
                periodType={periodType}
                onChangePeriod={changePeriod}
                onOpenCustom={() => setIsCustomOpen(true)}
            />

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

            {/* KPI'er */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-primary dark:text-slate-100">{t('kpi.heading')}</h2>
                    <p className="text-sm text-secondary dark:text-slate-400">{t('kpi.description')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                    <KPICard title={t('kpi.created')} icon={<ListTodo className="h-5 w-5" />} value={kpis?.created} loading={loading} />
                    <KPICard title={t('kpi.completed')} icon={<CheckCircle2 className="h-5 w-5" />} value={kpis?.completed} loading={loading} />
                    <KPICard title={t('kpi.active')} icon={<Clock3 className="h-5 w-5" />} value={kpis?.active} loading={loading} />
                    <KPICard title={t('kpi.overdue')} icon={<TriangleAlert className="h-5 w-5" />} value={kpis?.overdue} loading={loading} />
                    <KPICard
                        title={t('kpi.members')}
                        icon={<Users className="h-5 w-5" />}
                        value={kpis?.members}
                        subtitle={kpis ? t('kpi.membersWithActivity', { count: kpis.membersWithTaskActivity }) : undefined}
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

                <ChartCard
                    title={t('rooms.title')}
                    description={t('rooms.description')}
                    loading={loading}
                    error={errorMessage}
                    empty={stats?.taskRooms.length === 0}
                >
                    {stats && <TaskRoomChart data={stats.taskRooms} />}
                </ChartCard>
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
                    description={t('materials.statusDescription')}
                    loading={loading}
                    error={errorMessage}
                    empty={stats ? materialStatusRows.length === 0 : false}
                >
                    <BarList rows={materialStatusRows} ariaLabel={t('materials.statusTitle')} />
                </ChartCard>

                <ChartCard
                    title={t('materials.categoryTitle')}
                    description={t('materials.categoryDescription')}
                    loading={loading}
                    error={errorMessage}
                    empty={stats ? categoryRows.length === 0 : false}
                >
                    <BarList rows={categoryRows} ariaLabel={t('materials.categoryTitle')} />
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

            <SnapshotPanel
                periodStart={apiArgs.start}
                periodEnd={apiArgs.end}
                periodLabel={periodLabel}
                timeZone={apiArgs.tz}
            />
        </div>
    )
}
