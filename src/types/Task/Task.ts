export type ETaskStatus = 'Started' | 'InProgress' | 'Completed';

export interface Task {
  id: string;
  organisation_id: string;
  title: string;
  description: string | null;
  status: ETaskStatus;
  priorityColor?: string; 
}