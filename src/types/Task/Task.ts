import type { ReactNode } from 'react';
import type { ItemStatus } from '../dataLayer/datalayerTypes';
import type { Decision } from '../common/confirmType';

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

// Sortering på /tasks og /tasks/mine (FilterPanel, utils/taskFilters.ts).
export type TaskSortOption = 'newest' | 'oldest' | 'priority' | 'deadline';

// Statusser der har en kolonne på /tasks og /tasks/mine.
export type OpenTaskStatus = Extract<ETaskStatus, 'Started' | 'InProgress'>;

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

export interface CreateRoomInput {
  name: string;
  roleIds: string[];
}

export interface UpdateRoomInput extends CreateRoomInput {
  id: string;
}

// Tilmeld/afmeld/fjern en bruger på en opgave.
export interface TaskAssignmentInput {
  taskId: string;
  userId: string;
}

export type RequestStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface TaskRequest {
  id: string;
  task_id: string;
  requested_by: string;
  requested_at: string;
  status: RequestStatus;
  handled_by: string | null;
  done_at: string | null;
  rejection_reason: string | null;
}

export interface TaskAssignee {
  user_id: string;
  assigned_by: string;
  assigned_at: string;
}

// Router state for /tasks — preselects a room when arriving from /tasks/mine
export interface TasksLocationState {
    roomId?: string;
}

export interface RoomBarProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  // Personlige favoritrum - read_tasks, uafhængigt af update/delete.
  canFavorite: boolean;
}

export interface TaskColumnEmptyStateProps {
  // Tekst når kolonnen er tom uden aktive filtre ("Ingen opgaver i gang").
  emptyText: string;
  // Aktive filtre/søgning -> "Ingen opgaver matcher" + Nulstil i stedet.
  hasActiveFilters: boolean;
  onReset: () => void;
}

export type TaskColumnKey = 'available' | 'inProgress';

// Faner på /tasks og /tasks/mine under lg, hvor de to kolonner ikke kan stå
// side om side - så man ikke skal rulle forbi alle tilgængelige opgaver.
export interface TaskColumnTabsProps {
  active: TaskColumnKey;
  onChange: (column: TaskColumnKey) => void;
  availableLabel: string;
  availableCount: number;
  inProgressLabel: string;
  inProgressCount: number;
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

// Den tildeltes valgte udfald for én materiale-linje (US-42).
export interface TaskMaterialOutcome {
  taskMaterialId: string;
  outcomes: TaskMaterialStatusGroup[];
}

// Et valgt udfald i ResolveTaskMaterialsModal - itemId med, så de rigtige
// lager-tags kan invalideres.
export interface MaterialOutcomeEntry extends TaskMaterialOutcome {
  itemId: string;
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
  roomId: string | null;
  roomName: string | null;
  priority: ETaskPriority | null;
  endDate: string | null;
}

export type ApprovalSortOption = 'oldest' | 'newest' | 'priority' | 'deadline' | 'rejections';


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

// Godkend/afvis + bekræft-trin (med påkrævet begrundelse ved afvisning),
// delt af rækken i TaskApprovalsPanel og detalje-modalen.
export interface TaskApprovalActionsProps {
  canApprove: boolean;
  canReject: boolean;
  // Valgt beslutning for netop denne anmodning, der afventer bekræftelse.
  pending: Decision | null;
  submitting: boolean;
  onSelect: (decision: Decision) => void;
  onCancel: () => void;
  onConfirm: () => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
}

export interface TaskApprovalRowProps extends TaskApprovalActionsProps {
  request: PendingTaskRequest;
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
export interface PriorityBadgeProps {
  priority: ETaskPriority;
  // 'md' in detail views, 'sm' in list rows.
  size?: 'sm' | 'md';
  // Replaces the plain priority name, e.g. "Prioritet: Høj".
  label?: string;
}

// "Ingen"/"Alle" + de fire prioriteter. E er værdien for det tomme valg.
export interface PrioritySelectProps<E extends string> {
  id?: string;
  value: ETaskPriority | E;
  emptyValue: E;
  emptyLabel: string;
  onChange: (value: ETaskPriority | E) => void;
  className: string;
}

export interface RoomSelectProps {
  id: string;
  rooms: Room[];
  // '' = intet rum valgt.
  value: string;
  onChange: (roomId: string) => void;
  className?: string;
  disabled?: boolean;
}

// Felterne i opret/rediger opgave.
export interface TaskFormValues {
  title: string;
  description: string;
  // Kun ved oprettelse - redigering beholder opgavens rum.
  roomId?: string | null;
  startDate: string;
  endDate: string;
  priority: ETaskPriority | null;
  maxAssignees: number | null;
}

export interface TaskFormFieldsProps {
  idPrefix: string;
  values: TaskFormValues;
  onChange: (patch: Partial<TaskFormValues>) => void;
  // Vises lige over datoerne (fx slutdato før startdato).
  dateError?: string | null;
}

export interface CreateTaskModalProps {
  onClose: () => void;
  selectedRoomId: string | null;
}

export interface EditTaskModalProps {
  onClose: () => void;
  task: Task;
  canUpdate: boolean;
  canDelete: boolean;
  // Navne på tilmeldte - kalderen har dem allerede.
  assigneeNames: string[];
}

export interface RoomFormModalProps {
  onClose: () => void;
  // Uden rooms: opret et nyt rum. Med rooms: vælg og rediger et af dem.
  rooms?: Room[];
}

export interface DeleteRoomModalProps {
  onClose: () => void;
  rooms: Room[];
}

export interface TaskColumnLabels {
  heading: string;
  subtitle?: string;
  empty: string;
}

export interface TaskBoardProps {
  available: Task[];
  inProgress: Task[];
  openTaskId: string | null;
  onCloseOpenTask: () => void;
  // Fravalgt status skjuler kolonnen - medmindre den åbne opgave ligger der.
  selectedStatuses: OpenTaskStatus[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  labels: Record<TaskColumnKey, TaskColumnLabels>;
}

export interface TaskPageShellProps {
  isLoading: boolean;
  hasAccess: boolean;
  noAccessText: string;
  // Uden rooms vises ingen RoomBar (fx godkendelser uden read_tasks).
  rooms?: Room[];
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string | null) => void;
  // Fx søg/filtre - vises mellem RoomBar og indholdet.
  toolbar?: ReactNode;
  error: string | null;
  heading: ReactNode;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}
