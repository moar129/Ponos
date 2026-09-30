import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import type { TaskAssignee, TaskCardProps } from '../../types/Task/Task';
import type { OrganisationMember } from '../../types/role/roleType';
import {
  useGetTaskAssigneesQuery,
  useAssignToTaskMutation,
  useUnassignFromTaskMutation,
  useRemoveAssigneeFromTaskMutation,
  useUpdateTaskStatusMutation,
  useGetTaskRequestsQuery,
  useCreateTaskRequestMutation,
  useGetRoomsQuery,
  useGetTaskMaterialsQuery,
} from '../../store/apis/taskApi';
import { useGetOrganisationMembersQuery } from '../../store/apis/roleApi';
import { useGetMyProfileQuery } from '../../store/apis/profileApi';
import { useApplyMaterialOutcomes } from '../../store/hooks/useApplyMaterialOutcomes';
import { useDisplayName } from '../../store/hooks/useDisplayName';
import { formatDate, formatNumericDate } from '../../utils/formatDate';
import { formatFullName } from '../../utils/personName';
import type { MaterialOutcomeEntry } from '../../types/Task/Task';
import { EditTaskModal } from './EditTaskModal';
import { TaskTimeline } from './TaskTimeline';
import { TaskItemPicker } from './TaskItemPicker';
import { TaskMaterialsList } from './TaskMaterialsList';
import { ResolveTaskMaterialsModal } from './ResolveTaskMaterialsModal';
import { TaskChatButton } from './TaskChatButton';
import { PriorityBadge } from './PriorityBadge';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';

const SECTION_LABEL = 'mb-3 block text-xs font-bold uppercase text-secondary dark:text-slate-400';
const GRAY_BADGE = 'rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400';
const CLOSE_BUTTON = 'rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600';

export function TaskCard({ task, canUpdate, canDelete, canAssign, defaultDetailsOpen, onDetailsClose }: TaskCardProps) {
  const { t } = useTranslation(['tasks', 'common'])
  const displayName = useDisplayName();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(defaultDetailsOpen ?? false);
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const closeDetails = () => {
    setIsDetailsOpen(false);
    onDetailsClose?.();
  };

  const currentUserId = useGetMyProfileQuery().data?.id ?? null;
  const { data: assignees = [] } = useGetTaskAssigneesQuery(task.id);
  // Navne og billeder på de tilmeldte kommer fra organisationens
  // medlemsliste (hentet én gang, delt af alle kort).
  const { data: members = [] } = useGetOrganisationMembersQuery();
  const { data: rooms = [] } = useGetRoomsQuery();
  const { data: taskRequests = [] } = useGetTaskRequestsQuery(task.id);
  const { data: materials = [] } = useGetTaskMaterialsQuery(task.id);

  const [assignToTask] = useAssignToTaskMutation();
  const [unassignFromTask] = useUnassignFromTaskMutation();
  const [removeAssigneeFromTask] = useRemoveAssigneeFromTaskMutation();
  const [updateTaskStatus, { isLoading: isUpdatingStatus }] = useUpdateTaskStatusMutation();
  const [createTaskRequest, { isLoading: isCreatingRequest }] = useCreateTaskRequestMutation();
  const { resolve } = useApplyMaterialOutcomes(task.id);

  const memberById = new Map(members.map((member) => [member.id, member]));
  const assigneeName = (userId: string) => {
    const member = memberById.get(userId);
    return displayName(member && formatFullName(member.firstName, member.lastName));
  };

  const taskRoom = rooms.find((room) => room.id === task.room_id);
  const currentAssignee = assignees.find((assignee) => assignee.user_id === currentUserId);
  const isAssigned = currentAssignee !== undefined;

  // Selv-tilmeldt = frivillig, kan afmelde sig (kun mens opgaven er Started,
  // håndhævet i RLS). Tilføjet af en anden = tildeling: kan ikke afmelde
  // sig, men kan stadig påbegynde og melde færdig.
  const selfSigned = currentAssignee?.assigned_by === currentUserId;
  const canUnassignSelf = selfSigned && task.status === 'Started';

  const hasPendingCompletionRequest = taskRequests.some(
    (request) => request.requested_by === currentUserId && request.status === 'Pending'
  );

  // Seneste anmodning (listen er sorteret nyeste først) - er den afvist,
  // vises godkenderens begrundelse, indtil opgaven meldes færdig igen.
  const latestRequest = taskRequests[0];
  const rejectionReason =
    task.status === 'InProgress' && latestRequest?.status === 'Rejected' ? latestRequest.rejection_reason : null;

  const rejectionBox = rejectionReason && (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
      <p className="break-words">{t('card.rejectedWithReason', { reason: rejectionReason })}</p>
    </div>
  );

  const roomTag = (
    <span className="mt-1 inline-flex w-fit items-center rounded-md border border-border-gray bg-bg-gray px-2 py-0.5 text-xs font-semibold text-secondary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {t('fields.room')}: {taskRoom?.name ?? t('rooms.noRoom')}
    </span>
  );

  const timeline = (
    <div className="mb-6">
      <TaskTimeline status={task.status} createdAt={task.created_at} startedAt={null} finishedAt={task.finished_at} />
    </div>
  );

  const badges = (
    <>
      {task.priority && (
        <PriorityBadge
          priority={task.priority}
          size="md"
          label={t('card.priorityBadge', { priority: t(`priority.${task.priority}`) })}
        />
      )}
      <span className={GRAY_BADGE}>
        {task.max_assignees === null ? t('assignees.noLimit') : t('assignees.maxOf', { people: t('assignees.count', { count: task.max_assignees }) })}
      </span>
    </>
  );

  const handleAssignment = async () => {
    if (hasPendingCompletionRequest) return;

    if (canUnassignSelf) {
      await unassignFromTask({ taskId: task.id });
      return;
    }

    if (!isAssigned && currentUserId) {
      await assignToTask({ taskId: task.id, userId: currentUserId });
    }
  };

  const handleStartTask = async () => {
    if (!currentUserId || !isAssigned) return;
    await updateTaskStatus({ id: task.id, status: 'InProgress' });
  };

  const unresolvedMaterials = materials.filter((m) => !m.resolved);

  const proceedToComplete = async () => {
    if (task.requires_approval) {
      await createTaskRequest({ taskId: task.id });
      return;
    }
    await updateTaskStatus({ id: task.id, status: 'Completed' });
  };

  // Kaldes af ResolveTaskMaterialsModal, når den tildelte har valgt udfald
  // for alle uafrapporterede materialer. To forskellige stier, afhængigt af
  // om opgaven kræver godkendelse:
  // - MED godkendelse: udfaldene gemmes kun som DATA på anmodningen
  //   (createTaskRequest/materialOutcomes) - selve statusændringen på
  //   enhederne sker først i approve_task_request, når en godkender rent
  //   faktisk godkender. Afvises anmodningen i stedet, rører vi slet ikke
  //   materialerne (se 2026-09-23-defer-material-resolution-to-approval.sql).
  // - UDEN godkendelse: der er intet godkendelsestrin at vente på, så
  //   udfaldene anvendes med det samme, før opgaven markeres Completed.
  const handleResolveConfirm = async (entries: MaterialOutcomeEntry[]) => {
    if (task.requires_approval) {
      await createTaskRequest({
        taskId: task.id,
        materialOutcomes: entries.map(({ taskMaterialId, outcomes }) => ({ taskMaterialId, outcomes })),
      }).unwrap();
    } else {
      await resolve(entries);
      await updateTaskStatus({ id: task.id, status: 'Completed' });
    }

    setShowResolveModal(false);
  };

  const handleCompleteTask = async () => {
    if (!currentUserId || !isAssigned || hasPendingCompletionRequest) return;

    if (unresolvedMaterials.length > 0) {
      setShowResolveModal(true);
      return;
    }

    await proceedToComplete();
  };

  const unassignedMembers = members.filter((member) => !assignees.some((assignee) => assignee.user_id === member.id));
  const isFull = task.max_assignees !== null && assignees.length >= task.max_assignees;

  return (
    <>
      {/* TASK CARD */}
      <div
        onClick={() => setIsDetailsOpen(true)}
        className="w-full cursor-pointer rounded-xl border-2 border-border-gray bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-4 min-w-0">
          <h3 className="text-xl font-bold text-primary dark:text-slate-100">{task.title}</h3>
          {roomTag}
        </div>

        {/* BESKRIVELSE */}
        <div className="relative mb-5 min-h-[100px] rounded-lg border border-border-gray bg-bg-gray/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <span className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold uppercase text-secondary dark:bg-slate-800 dark:text-slate-400">
            {t('common:info')}
          </span>
          <p className="break-words text-sm text-secondary hyphens-auto dark:text-slate-400">
            {task.description || t('card.noDescription')}
          </p>
        </div>

        {timeline}

        <div className="mb-4 flex flex-wrap gap-2">{badges}</div>

        <div className="mb-6">
          <span className={SECTION_LABEL}>{t('card.responsible')}</span>
          <AssigneeList assignees={assignees} currentUserId={currentUserId} nameOf={assigneeName} memberById={memberById} />
        </div>

        {/* DATOER */}
        <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border-gray pt-3 text-sm text-secondary dark:border-slate-700 dark:text-slate-400">
          {([['card.start', task.start_date], ['card.end', task.end_date]] as const).map(([labelKey, date]) => (
            <div key={labelKey}>
              <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">{t(labelKey)}</span>
              <span className="font-medium text-primary dark:text-slate-100">{date ? formatNumericDate(date) : '—'}</span>
            </div>
          ))}
        </div>

        {rejectionBox}

        {/* HANDLINGER */}
        <div className="flex flex-wrap gap-3">
          {(task.status === 'Started' || task.status === 'InProgress') && (
            <>
              {/* TILMELD / AFMELD */}
              {!hasPendingCompletionRequest && (
                <button
                  type="button"
                  disabled={isAssigned && !canUnassignSelf}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignment();
                  }}
                  className={`rounded border-2 px-4 xl:px-8 py-2 text-xs font-bold uppercase tracking-widest transition-all ${canUnassignSelf
                      ? 'border-red-800 text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400'
                      : isAssigned
                        ? 'cursor-not-allowed border-border-gray bg-bg-gray text-secondary dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400'
                        : 'border-accent text-accent hover:bg-accent hover:text-accent-text'
                    }`}
                >
                  {canUnassignSelf ? t('assignees.signOff') : isAssigned ? t('assignees.assignedToYou') : t('assignees.signUp')}
                </button>
              )}

              {/* PÅBEGYND ARBEJDE */}
              {task.status === 'Started' && isAssigned && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTask();
                  }}
                  className="rounded border-2 border-accent bg-accent px-4 xl:px-8 py-2 text-xs font-bold uppercase tracking-widest text-accent-text transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingStatus ? t('common:updating') : t('card.startWork')}
                </button>
              )}

              {/* MELD FÆRDIG */}
              {task.status === 'InProgress' && isAssigned && (
                <button
                  type="button"
                  disabled={isUpdatingStatus || isCreatingRequest || hasPendingCompletionRequest}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompleteTask();
                  }}
                  className={`rounded border-2 px-4 xl:px-8 py-2 text-xs font-bold uppercase tracking-widest transition-all ${hasPendingCompletionRequest
                      ? 'cursor-not-allowed border-border-gray bg-bg-gray text-secondary dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400'
                      : 'border-green-700 text-green-700 hover:bg-green-700 hover:text-white dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white'
                    }`}
                >
                  {hasPendingCompletionRequest
                    ? t('card.awaitingApproval')
                    : isCreatingRequest || isUpdatingStatus
                      ? t('common:sending')
                      : t('card.markDone')}
                </button>
              )}
            </>
          )}

          {/* OPGAVE-CHAT - jeg er deltager, eller tilmeldt og kan melde mig ind igen */}
          <TaskChatButton taskId={task.id} canJoin={isAssigned && assignees.length >= 2} />
        </div>
      </div>

      {/* AFRAPPORTERING AF MATERIALER (før færdiggørelse) */}
      {showResolveModal && (
        <ResolveTaskMaterialsModal
          materials={materials}
          requiresApproval={task.requires_approval}
          onCancel={() => setShowResolveModal(false)}
          onConfirm={handleResolveConfirm}
        />
      )}

      {/* OPGAVEDETALJER */}
      {isDetailsOpen && (
        <Modal
          onClose={closeDetails}
          size="2xl"
          title={task.title}
          subtitle={<>{t('card.details')}<br />{roomTag}</>}
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              {/* Gemme er gated af canUpdate og sletning af canDelete inde
                  i EditTaskModal, så knappen vises ved hver af de to. */}
              {canUpdate || canDelete ? (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="text-sm font-semibold text-accent hover:text-accent-hover"
                >
                  {t('common:edit')}
                </button>
              ) : <span />}

              <button type="button" onClick={closeDetails} className={CLOSE_BUTTON}>
                {t('common:close')}
              </button>
            </div>
          }
        >
          <div className="mb-5 rounded-lg border border-border-gray bg-bg-gray/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <span className="mb-2 block text-xs font-bold uppercase text-secondary dark:text-slate-400">{t('common:description')}</span>
            <p className="break-words text-sm text-secondary dark:text-slate-400">{task.description || t('card.noDescription')}</p>
          </div>

          {timeline}

          <div className="mb-5">
            <div className="flex flex-wrap gap-2">
              {badges}
              <span className={GRAY_BADGE}>{t('card.statusValue', { status: t(`status.${task.status}`) })}</span>
            </div>

            {rejectionBox && <div className="mt-3">{rejectionBox}</div>}

            {task.requires_approval && (
              <div className="mt-3">
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {t('card.requiresApproval')}
                </span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <span className={SECTION_LABEL}>{t('card.responsible')}</span>
            <AssigneeList
              assignees={assignees}
              currentUserId={currentUserId}
              nameOf={assigneeName}
              memberById={memberById}
              onRemove={canAssign ? (userId) => void removeAssigneeFromTask({ taskId: task.id, userId }) : undefined}
            />

            {canAssign && (
              <button
                type="button"
                onClick={() => setIsEmployeePickerOpen(true)}
                className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                {t('card.addEmployeeShort')}
              </button>
            )}
          </div>

          <div className="mb-6">
            <span className={SECTION_LABEL}>{t('materials.heading')}</span>
            <TaskMaterialsList taskId={task.id} canManage={canUpdate} taskStatus={task.status} />
            {canUpdate && <TaskItemPicker taskId={task.id} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([['fields.startDate', task.start_date], ['fields.endDate', task.end_date]] as const).map(([labelKey, date]) => (
              <div key={labelKey} className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">{t(labelKey)}</span>
                <span className="mt-1 block font-medium text-primary dark:text-slate-100">{date ? formatDate(date) : '—'}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* TILFØJ MEDARBEJDER */}
      {isEmployeePickerOpen && (
        <Modal
          onClose={() => setIsEmployeePickerOpen(false)}
          title={t('assignees.addEmployee')}
          subtitle={t('assignees.chooseWho')}
          footer={
            <button type="button" onClick={() => setIsEmployeePickerOpen(false)} className={CLOSE_BUTTON}>
              {t('common:close')}
            </button>
          }
        >
          <div className="mb-4 rounded-lg bg-bg-gray/40 px-4 py-3 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-secondary dark:text-slate-400">
              {t('card.responsible')}:{' '}
              {task.max_assignees === null ? assignees.length : `${assignees.length} / ${task.max_assignees}`}
            </p>
            {isFull && <p className="mt-1 text-xs text-secondary dark:text-slate-400">{t('assignees.maxReached')}</p>}
          </div>

          {isFull ? (
            <p className="py-6 text-center text-sm text-secondary dark:text-slate-400">{t('assignees.noFreeSlots')}</p>
          ) : unassignedMembers.length === 0 ? (
            <p className="py-4 text-center text-sm text-secondary dark:text-slate-400">{t('assignees.nobodyToAssign')}</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {unassignedMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={async () => {
                    await assignToTask({ taskId: task.id, userId: member.id });
                    setIsEmployeePickerOpen(false);
                  }}
                  className="w-full rounded-lg border border-border-gray px-4 py-3 text-left transition hover:border-secondary hover:bg-bg-gray dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  <PersonRow member={member} name={formatFullName(member.firstName, member.lastName) || member.email} detail={member.email} />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {isEditOpen && (
        <EditTaskModal
          onClose={() => setIsEditOpen(false)}
          task={task}
          canUpdate={canUpdate}
          canDelete={canDelete}
          assigneeNames={assignees.map((a) => assigneeName(a.user_id))}
        />
      )}
    </>
  );
}

// Avatar + navn + en linje under - de tilmeldte og medarbejder-vælgeren.
function PersonRow({ member, name, detail }: { member: OrganisationMember | undefined; name: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        firstName={member?.firstName}
        lastName={member?.lastName}
        urlPicture={member?.urlPicture}
        className="h-10 w-10 bg-bg-gray text-primary dark:bg-slate-700 dark:text-slate-100"
        textClassName="text-sm font-bold"
      />
      <div>
        <p className="font-medium text-primary dark:text-slate-100">{name}</p>
        <p className="text-xs text-secondary dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

// De tilmeldte på kortet og i detaljerne. Med onRemove kan de fjernes.
function AssigneeList({
  assignees,
  currentUserId,
  nameOf,
  memberById,
  onRemove,
}: {
  assignees: TaskAssignee[];
  currentUserId: string | null;
  nameOf: (userId: string) => string;
  memberById: Map<string, OrganisationMember>;
  onRemove?: (userId: string) => void;
}) {
  const { t } = useTranslation(['tasks', 'common']);

  if (assignees.length === 0) {
    return <p className="text-sm text-secondary dark:text-slate-400">{t('assignees.nobodyAssigned')}</p>;
  }

  return (
    <div className="space-y-2">
      {assignees.map((assignee) => (
        <div
          key={assignee.user_id}
          className="flex items-center justify-between rounded-lg border border-border-gray px-4 py-3 dark:border-slate-700"
        >
          <PersonRow
            member={memberById.get(assignee.user_id)}
            name={nameOf(assignee.user_id)}
            detail={assignee.assigned_by === currentUserId ? t('assignees.selfSigned') : t('assignees.assignedByOther')}
          />

          <div className="flex items-center gap-3">
            {assignee.user_id === currentUserId && (
              <span className="text-xs font-semibold text-secondary dark:text-slate-400">{t('common:you')}</span>
            )}

            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(assignee.user_id);
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                {t('common:remove')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
