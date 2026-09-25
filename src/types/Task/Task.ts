import type { ItemStatus } from '../dataLayer/datalayerTypes';

export type ETaskStatus = 'Started' | 'InProgress' | 'Completed';
export type ETaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  id: string;
  room_id: string | null;
  organisation_id: string;
  title: string;
  description: string | null;

  created_at: string;
  start_date: string | null;
  end_date: string | null;
  finished_at: string | null;

  status: ETaskStatus;
  priority: ETaskPriority | null;
  max_assignees: number | null;
  requires_approval: boolean;
}

export interface Room {
  id: string;
  organisation_id: string;
  name: string;
  role_ids: string[]; // empty = open to everyone with read_tasks
  created_at: string;
}

export interface RoomRolePickerProps {
  selectedRoleIds: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
  suggestedRoleName?: string; // prefilled name when creating a role from the picker
}

export interface TaskAssignee {
  user_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface TaskState {
  tasks: Task[];
  rooms: Room[];
  loading: boolean;
  error: string | null;
  userOrgId: string | null;
}

// Router state for /tasks — preselects a room when arriving from /tasks/mine
export interface TasksLocationState {
    roomId?: string;
}

export interface RoomBarProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  onAddRoom: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface TaskCardProps {
  task: Task;
  onJoin?: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  canAssign: boolean;
  defaultDetailsOpen?: boolean;
  onDetailsClose?: () => void;
}

export interface CompletedTaskAssignee {
  id: string;
  name: string;
}

export interface CompletedTaskMaterial {
  itemId: string;
  name: string;
  quantity: number;
}

export interface TaskMaterialStatusGroup {
  status: ItemStatus;
  quantity: number;
}

export interface TaskMaterial {
  id: string;
  itemId: string;
  itemName: string;
  unitOfMeasurement: string;
  quantity: number; // original reserved quantity
  linkedGroups: TaskMaterialStatusGroup[]; // current status split of what is still linked - empty = fully resolved
  resolved: boolean; // linkedGroups.length === 0
  locationLabels: string[]; // distinct locations of the still-linked units ("Lager > Sektion")
  hasUnitsWithoutLocation: boolean; // some still-linked units have no location
}

// Location chosen when attaching a material; id null = units without a location.
export interface StagedLocation {
  id: string | null;
  label: string;
}

export interface TaskMaterialsListProps {
  taskId: string;
  canManage: boolean;
  taskStatus: ETaskStatus;
}

export interface CompletedTaskDetails extends Task {
  roomName: string | null;
  assignees: CompletedTaskAssignee[];
  materials: CompletedTaskMaterial[];
}

export interface PendingTaskRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  requestedBy: string;
  requesterName: string;
  requestedAt: string;
  rejectionCount: number; // earlier rejected completion requests on the task
}

export type TaskRequestDecision = 'approve' | 'reject';

export interface ReviewTaskRequestInput {
  requestId: string;
  taskId: string;
}

export interface RejectTaskRequestInput extends ReviewTaskRequestInput {
  reason: string;
}

export interface RejectReasonInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export interface TaskApprovalRowProps {
  request: PendingTaskRequest;
  canApprove: boolean;
  canReject: boolean;
  pendingDecision: { requestId: string; decision: TaskRequestDecision } | null;
  submitting: boolean;
  onSelect: (decision: { requestId: string; decision: TaskRequestDecision }) => void;
  onCancel: () => void;
  onConfirm: (decision: { requestId: string; decision: TaskRequestDecision }) => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onOpenDetails: () => void;
}

export interface TaskRequestDetailsMaterial {
  id: string;
  itemName: string;
  unitOfMeasurement: string;
  quantity: number; // original reserved quantity
  linkedGroups: TaskMaterialStatusGroup[]; // current status split of still-linked units
  locationLabels: string[];
  hasUnitsWithoutLocation: boolean;
  proposedOutcomes: TaskMaterialStatusGroup[] | null; // requester's chosen outcome, applied on approval
}

export interface TaskRequestRejection {
  reason: string | null; // null for rejections made before rejection_reason existed
  rejectedAt: string | null;
  rejectedByName: string;
  requesterName: string;
  requestedAt: string;
}

export interface TaskRequestDetails {
  task: Pick<Task, 'id' | 'title' | 'description' | 'priority' | 'status' | 'start_date' | 'end_date' | 'requires_approval'>;
  roomName: string | null;
  requesterName: string;
  requestedAt: string;
  assignees: string[];
  materials: TaskRequestDetailsMaterial[];
  previousRejections: TaskRequestRejection[]; // newest first
}

export type TaskApprovalDetailsModalProps = Omit<TaskApprovalRowProps, 'onOpenDetails'> & {
  errorMessage: string | null;
  onClose: () => void;
};