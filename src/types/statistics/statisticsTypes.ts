export type StatisticsValueName =
    | 'tasks_created'
    | 'tasks_completed'
    | 'tasks_in_progress'
    | 'tasks_overdue'
    | 'average_task_duration'
    | 'active_members'
    | 'tasks_per_member'
    | 'team_distribution'
    | 'approval_rate'
    | 'rejected_tasks'
    | 'average_approval_time'
    | 'material_usage'
    | 'top_materials'
    | 'inventory_status'
    | 'tasks_by_priority';

export interface StatisticsValue {
    id: string;
    snapshot_id: string;
    name: StatisticsValueName;
    value: number;
    period_start: string;
    period_end: string;
}

export interface StatisticsSnapshot {
    id: string;
    organisation_id: string;
    period_start: string;
    period_end: string;
    created_at: string;
    values: StatisticsValue[];
}