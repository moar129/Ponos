import type { ReactNode } from 'react'
import { CheckCircle2, MailQuestion, PackageX, TriangleAlert, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AttentionPanelProps } from '../../types/statistics/statisticsComponentTypes'

type Tone = 'bad' | 'warn' | 'ok'

const TONE: Record<Tone, string> = {
    bad: 'text-red-700 dark:text-red-400',
    warn: 'text-amber-700 dark:text-amber-400',
    ok: 'text-secondary dark:text-slate-400',
}

interface AttentionItemProps {
    icon: ReactNode
    title: string
    count: number
    tone: Tone
    details: string[]
    to: string
    linkLabel: string
}

// Icon + number + text, never colour alone.
function AttentionItem({ icon, title, count, tone, details, to, linkLabel }: AttentionItemProps) {
    return (
        <div className="flex gap-3 rounded-md border border-border-gray p-3 dark:border-slate-700">
            <span className={`mt-0.5 shrink-0 ${TONE[tone]}`}>{icon}</span>
            <div className="min-w-0">
                <p className="text-sm font-medium text-secondary dark:text-slate-400">{title}</p>
                <p className={`text-2xl font-semibold tabular-nums ${count > 0 ? TONE[tone] : 'text-primary dark:text-slate-100'}`}>
                    {count}
                </p>
                {details.map((detail) => (
                    <p key={detail} className="text-xs text-secondary dark:text-slate-400">{detail}</p>
                ))}
                <Link to={to} className="mt-1 inline-block text-xs font-medium text-accent hover:underline">
                    {linkLabel}
                </Link>
            </div>
        </div>
    )
}

// "Lige nu": what needs action today, independent of the period filter.
// Task figures follow the room filter; stock and membership are always the
// whole organisation.
export function AttentionPanel({ data, roomName, categoryName }: AttentionPanelProps) {
    const { t } = useTranslation(['statistics', 'tasks', 'datalayer'])

    const overdue = data.overdueByPriority.reduce((total, row) => total + row.count, 0)
    const urgentOverdue = data.overdueByPriority.some((row) => row.priority === 'Critical' || row.priority === 'High')
    const stockUnits = data.stockAlerts.reduce((total, row) => total + row.count, 0)
    const pendingMembership = data.pendingRequests + data.pendingInvitations
    const allClear = overdue === 0 && data.unassigned === 0 && stockUnits === 0 && data.itemsWithoutAvailable === 0
        && pendingMembership === 0

    const priorityDetail = data.overdueByPriority
        .map((row) => `${row.priority ? t(`tasks:priority.${row.priority}`) : t('priority.none')}: ${row.count}`)
        .join(' · ')
    const stockDetail = data.stockAlerts
        .filter((row) => row.count > 0)
        .map((row) => `${t(`datalayer:status.${row.status}`)}: ${row.count}`)
        .join(' · ')

    return (
        <section aria-labelledby="statistics-attention-title" className="space-y-3">
            <div>
                <h2 id="statistics-attention-title" className="text-base font-semibold text-primary dark:text-slate-100">
                    {t('attention.title')}
                </h2>
                <p className="text-sm text-secondary dark:text-slate-400">
                    {t('attention.description')}
                    {roomName && ` ${t('attention.roomNote', { room: roomName })}`}
                    {categoryName && ` ${t('attention.categoryNote', { category: categoryName })}`}
                </p>
            </div>

            {allClear ? (
                <p className="flex items-center gap-2 rounded-md border border-border-gray p-3 text-sm text-green-700 dark:border-slate-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    {t('attention.allClear')}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <AttentionItem
                        icon={<TriangleAlert className="h-5 w-5" />}
                        title={t('attention.overdueTitle')}
                        count={overdue}
                        tone={urgentOverdue ? 'bad' : overdue > 0 ? 'warn' : 'ok'}
                        details={priorityDetail ? [priorityDetail] : []}
                        to="/tasks"
                        linkLabel={t('attention.goToTasks')}
                    />
                    <AttentionItem
                        icon={<UserX className="h-5 w-5" />}
                        title={t('attention.unassignedTitle')}
                        count={data.unassigned}
                        tone={data.unassigned > 0 ? 'warn' : 'ok'}
                        details={[t('attention.unassignedDetail')]}
                        to="/tasks"
                        linkLabel={t('attention.goToTasks')}
                    />
                    <AttentionItem
                        icon={<PackageX className="h-5 w-5" />}
                        title={t('attention.stockTitle')}
                        count={stockUnits}
                        tone={stockUnits > 0 || data.itemsWithoutAvailable > 0 ? 'warn' : 'ok'}
                        details={[
                            ...(stockDetail ? [stockDetail] : []),
                            ...(data.itemsWithoutAvailable > 0
                                ? [t('attention.itemsWithoutAvailable', { count: data.itemsWithoutAvailable })]
                                : []),
                        ]}
                        to="/datalager"
                        linkLabel={t('attention.goToDatalayer')}
                    />
                    <AttentionItem
                        icon={<MailQuestion className="h-5 w-5" />}
                        title={t('attention.membershipTitle')}
                        count={pendingMembership}
                        tone={pendingMembership > 0 ? 'warn' : 'ok'}
                        details={[
                            t('attention.requests', { count: data.pendingRequests }),
                            t('attention.invitations', { count: data.pendingInvitations }),
                        ]}
                        to="/dashboard?tab=administration"
                        linkLabel={t('attention.goToAdministration')}
                    />
                </div>
            )}
        </section>
    )
}
