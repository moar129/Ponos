
export type ETaskStatus = 'Started' | 'InProgress' | 'Completed';
export type ETaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  id: string;
  room_id: string | null;
  organisation_id: string;
  title: string;
  description: string | null;
  status: ETaskStatus;
  priority: ETaskPriority | null;
  max_assignees: number | null;
}

export  interface Room {
  id: string;
  organisation_id: string;
  name: string;
  required_role_id: string | null;
  created_at: string;
}

export interface TaskState {
  tasks: Task[];
  rooms: Room[];
  loading: boolean;
  error: string | null;
  userOrgId: string | null;
}

