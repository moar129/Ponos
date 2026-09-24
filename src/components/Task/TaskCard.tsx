import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'
import type { TaskCardProps } from '../../types/Task/Task';
import {
  useGetTaskAssigneesQuery,
  useGetOrganisationEmployeesQuery,
  useAssignToTaskMutation,
  useUnassignFromTaskMutation,
  useRemoveAssigneeFromTaskMutation,
  useUpdateTaskStatusMutation,
  useGetTaskRequestsQuery,
  useCreateTaskRequestMutation,
  useGetRoomsQuery,
  useGetTaskMaterialsQuery,
  useResolveTaskMaterialUnitsMutation,
} from '../../store/apis/taskApi';
import { EditTaskModal } from './EditTaskModal';
import { TaskTimeline } from './TaskTimeline';
import { TaskItemPicker } from './TaskItemPicker';
import { TaskMaterialsList } from './TaskMaterialsList';
import { ResolveTaskMaterialsModal } from './ResolveTaskMaterialsModal';
import type { MaterialOutcomeEntry } from './ResolveTaskMaterialsModal';
import { formatNumericDate, formatDate as formatLongDate } from '../../utils/formatDate';
import { supabase } from '../../lib/supabase';

export function TaskCard({ task, canUpdate, canDelete, canAssign, defaultDetailsOpen, onDetailsClose }: TaskCardProps) {
  const { t } = useTranslation(['tasks', 'common'])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(
    defaultDetailsOpen ?? false
  );

  const closeDetails = () => {
    setIsDetailsOpen(false);
    onDetailsClose?.();
  };

  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);

  const [assigneeProfiles, setAssigneeProfiles] = useState<
    Record<
      string,
      {
        name: string;
        url_picture: string | null;
      }
    >
  >({});

  const { data: assignees = [] } = useGetTaskAssigneesQuery(task.id);
  const { data: employees = [] } = useGetOrganisationEmployeesQuery();
  const { data: rooms = [] } = useGetRoomsQuery();
  const { data: taskRequests = [] } = useGetTaskRequestsQuery(task.id);
  const { data: materials = [] } = useGetTaskMaterialsQuery(task.id);

  const [assignToTask] = useAssignToTaskMutation();
  const [unassignFromTask] = useUnassignFromTaskMutation();
  const [removeAssigneeFromTask] =
    useRemoveAssigneeFromTaskMutation();

  const [updateTaskStatus, { isLoading: isUpdatingStatus }] =
    useUpdateTaskStatusMutation();

  const [createTaskRequest, { isLoading: isCreatingRequest }] =
    useCreateTaskRequestMutation();

  const [resolveTaskMaterialUnits] = useResolveTaskMaterialUnitsMutation();

  const [showResolveModal, setShowResolveModal] = useState(false);

  const taskRoom = rooms.find((room) => room.id === task.room_id);

  const currentAssignee = assignees.find(
    (assignee) => assignee.user_id === currentUserId
  );

  const isAssigned = currentAssignee !== undefined;

  // Selv-tilmeldt = frivillig, kan afmelde sig (kun mens opgaven er Started,
  // håndhævet i RLS). Tilføjet af en anden = tildeling: kan ikke afmelde
  // sig, men kan stadig påbegynde og melde færdig.
  const selfSigned =
    currentAssignee?.assigned_by === currentUserId;

  const canUnassignSelf = selfSigned && task.status === 'Started';

  const currentPendingRequest = taskRequests.find(
    (request) =>
      request.requested_by === currentUserId &&
      request.status === 'Pending'
  );

  const hasPendingCompletionRequest =
    currentPendingRequest !== undefined;

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();

      setCurrentUserId(data.user?.id ?? null);
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    const getAssigneeProfiles = async () => {
      if (assignees.length === 0) {
        setAssigneeProfiles({});
        return;
      }

      const userIds = assignees.map(
        (assignee) => assignee.user_id
      );

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, url_picture')
        .in('id', userIds);

      if (error || !data) {
        return;
      }

      const profiles: Record<
        string,
        {
          name: string;
          url_picture: string | null;
        }
      > = {};

      data.forEach((profile) => {
        profiles[profile.id] = {
          name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
          url_picture: profile.url_picture,
        };
      });

      setAssigneeProfiles(profiles);
    };

    getAssigneeProfiles();
  }, [assignees]);

  const handleAssignment = async () => {
    if (hasPendingCompletionRequest) {
      return;
    }

    if (canUnassignSelf) {
      await unassignFromTask({
        taskId: task.id,
        userId: currentUserId!,
      });

      return;
    }

    if (!isAssigned && currentUserId) {
      await assignToTask({
        taskId: task.id,
        userId: currentUserId,
      });
    }
  };

  const handleStartTask = async () => {
    if (!currentUserId || !isAssigned) {
      return;
    }

    await updateTaskStatus({
      id: task.id,
      status: 'InProgress',
    });
  };

  const unresolvedMaterials = materials.filter((m) => !m.resolved);

  const proceedToComplete = async () => {
    if (task.requires_approval) {
      await createTaskRequest({ taskId: task.id });
      return;
    }

    await updateTaskStatus({
      id: task.id,
      status: 'Completed',
    });
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
  //   udfaldene anvendes med det samme (resolveTaskMaterialUnits pr. linje),
  //   før opgaven markeres Completed.
  const handleResolveConfirm = async (entries: MaterialOutcomeEntry[]) => {
    if (task.requires_approval) {
      await createTaskRequest({
        taskId: task.id,
        materialOutcomes: entries.map(({ taskMaterialId, outcomes }) => ({ taskMaterialId, outcomes })),
      }).unwrap();
    } else {
      for (const entry of entries) {
        await resolveTaskMaterialUnits({
          taskMaterialId: entry.taskMaterialId,
          taskId: task.id,
          itemId: entry.itemId,
          outcomes: entry.outcomes,
        }).unwrap();
      }

      await updateTaskStatus({ id: task.id, status: 'Completed' });
    }

    setShowResolveModal(false);
  };

  const handleCompleteTask = async () => {
    if (!currentUserId || !isAssigned) {
      return;
    }

    if (hasPendingCompletionRequest) {
      return;
    }

    if (unresolvedMaterials.length > 0) {
      setShowResolveModal(true);
      return;
    }

    await proceedToComplete();
  };

  const getPriorityColor = (
    priority: TaskCardProps['task']['priority']
  ) => {
    switch (priority) {
      case 'Low':
        return 'bg-green-100 text-green-700 dark:bg-emerald-900/30 dark:text-emerald-400';

      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-amber-900/30 dark:text-amber-400';

      case 'High':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';

      case 'Critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

      default:
        return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return formatNumericDate(date);
  };

  const formatFullDate = (date: string | null) => {
    if (!date) return '—';
    return formatLongDate(date);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);

    if (parts.length === 0) {
      return '?';
    }

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  return (
    <>
      {/* TASK CARD */}
      <div
        onClick={() => setIsDetailsOpen(true)}
        className="w-full cursor-pointer rounded-xl border-2 border-border-gray bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
      >
        {/* HEADER */}
        <div className="mb-4 flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-primary dark:text-slate-100">
              {task.title}
            </h3>

            <span className="mt-1 inline-flex w-fit items-center rounded-md border border-border-gray bg-bg-gray px-2 py-0.5 text-xs font-semibold text-secondary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {taskRoom
                ? `Rum: ${taskRoom.name}`
                : 'Rum: Uden rum'}
            </span>
          </div>
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

        {/* TIDSLINJE */}
        <div className="mb-6">
          <TaskTimeline
            status={task.status}
            createdAt={task.created_at}
            startedAt={null}
            finishedAt={task.finished_at}
          />
        </div>

        {/* BADGES */}
        <div className="mb-4 flex flex-wrap gap-2">
          {task.priority && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(
                task.priority
              )}`}
            >
              {t('card.priorityBadge', { priority: t(`priority.${task.priority}`) })}
            </span>
          )}

          <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
            {task.max_assignees === null
              ? t('assignees.noLimit')
              : `Maks. ${task.max_assignees} personer`}
          </span>
        </div>

        {/* ANSVARLIGE */}
        <div className="mb-6">
          <span className="mb-3 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
            {t('card.responsible')}
          </span>

          {assignees.length === 0 ? (
            <p className="text-sm text-secondary dark:text-slate-400">
              {t('assignees.nobodyAssigned')}
            </p>
          ) : (
            <div className="space-y-2">
              {assignees.map((assignee) => {
                const profile =
                  assigneeProfiles[assignee.user_id];

                const name = profile?.name || t('assignees.unknownUser');

                const assignedByMe =
                  assignee.assigned_by === currentUserId;

                return (
                  <div
                    key={assignee.user_id}
                    className="flex items-center justify-between rounded-lg border border-border-gray px-4 py-3 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      {profile?.url_picture ? (
                        <img
                          src={profile.url_picture}
                          alt={name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-gray text-sm font-bold text-primary dark:bg-slate-700 dark:text-slate-100">
                          {getInitials(name)}
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-primary dark:text-slate-100">
                          {name}
                        </p>

                        <p className="text-xs text-secondary dark:text-slate-400">
                          {assignedByMe
                            ? t('assignees.selfSigned')
                            : t('assignees.assignedByOther')}
                        </p>
                      </div>
                    </div>

                    {assignee.user_id === currentUserId && (
                      <span className="text-xs font-semibold text-secondary dark:text-slate-400">
                        {t('common:you')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DATOER */}
        <div className="mb-5 flex gap-8 border-t border-border-gray pt-3 text-sm text-secondary dark:border-slate-700 dark:text-slate-400">
          <div>
            <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
              {t('card.start')}
            </span>

            <span className="font-medium text-primary dark:text-slate-100">
              {formatDate(task.start_date)}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
              {t('card.end')}
            </span>

            <span className="font-medium text-primary dark:text-slate-100">
              {formatDate(task.end_date)}
            </span>
          </div>
        </div>

        {/* HANDLINGER */}
        <div className="flex flex-wrap gap-3">
          {/* TILMELD / AFMELD */}
          {(task.status === 'Started' ||
            task.status === 'InProgress') && (
              <>
                {!hasPendingCompletionRequest && (
                  <button
                    type="button"
                    disabled={isAssigned && !canUnassignSelf}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignment();
                    }}
                    className={`rounded border-2 px-8 py-2 text-xs font-bold uppercase tracking-widest transition-all ${canUnassignSelf
                        ? 'border-red-800 text-red-600 hover:bg-red-600 hover:text-white dark:text-red-400'
                        : isAssigned
                          ? 'cursor-not-allowed border-border-gray bg-bg-gray text-secondary dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400'
                          : 'border-accent text-accent hover:bg-accent hover:text-white'
                      }`}
                  >
                    {canUnassignSelf
                      ? 'Afmeld'
                      : isAssigned
                        ? 'Tildelt dig'
                        : 'Tilmeld'}
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
                    className="rounded border-2 border-accent bg-accent px-8 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingStatus
                      ? t('common:updating')
                      : t('card.startWork')}
                  </button>
                )}

                {/* MELD FÆRDIG */}
                {task.status === 'InProgress' && isAssigned && (
                  <button
                    type="button"
                    disabled={
                      isUpdatingStatus ||
                      isCreatingRequest ||
                      hasPendingCompletionRequest
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteTask();
                    }}
                    className={`rounded border-2 px-8 py-2 text-xs font-bold uppercase tracking-widest transition-all ${hasPendingCompletionRequest
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

      {/* TASK DETAILS POPUP */}
      {isDetailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            closeDetails();
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border-gray bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="overflow-y-auto p-6">
            {/* HEADER */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary dark:text-slate-100">
                  {task.title}
                </h2>

                <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                  {t('card.details')}
                </p>

                <span className="mt-1 inline-flex w-fit items-center rounded-md border border-border-gray bg-bg-gray px-2 py-0.5 text-xs font-semibold text-secondary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {taskRoom
                    ? `Rum: ${taskRoom.name}`
                    : 'Rum: Uden rum'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* REDIGER - gemme er gated af canUpdate og sletning af
                    canDelete inde i EditTaskModal, så knappen vises ved
                    hver af de to */}
                {(canUpdate || canDelete) && (
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(true)}
                    className="text-sm font-semibold text-accent hover:text-accent-hover"
                  >
                    {t('card.edit')}
                  </button>
                )}

                {/* LUK */}
                <button
                  type="button"
                  onClick={() => {
                    closeDetails();
                  }}
                  className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                >
                  X
                </button>
              </div>
            </div>

            {/* BESKRIVELSE */}
            <div className="mb-5 rounded-lg border border-border-gray bg-bg-gray/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <span className="mb-2 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
                {t('common:description')}
              </span>

              <p className="break-words text-sm text-secondary dark:text-slate-400">
                {task.description || t('card.noDescription')}
              </p>
            </div>

            {/* TIDSLINJE */}
            <div className="mb-6">
              <TaskTimeline
                status={task.status}
                createdAt={task.created_at}
                startedAt={null}
                finishedAt={task.finished_at}
              />
            </div>

            {/* PRIORITET + PERSONER */}
            <div className="mb-5">
              <div className="flex flex-wrap gap-2">
                {task.priority && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {t('card.priorityBadge', { priority: t(`priority.${task.priority}`) })}
                  </span>
                )}

                <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                  {task.max_assignees === null
                    ? t('assignees.noLimit')
                    : `Maks. ${task.max_assignees} personer`}
                </span>

                <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                  {t('card.statusValue', { status: t(`status.${task.status}`) })}
                </span>
              </div>

              {task.requires_approval && (
                <div className="mt-3">
                  <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {t('card.requiresApproval')}
                  </span>
                </div>
              )}
            </div>

            {/* ANSVARLIGE */}
            <div className="mb-6">
              <span className="mb-3 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
                {t('card.responsible')}
              </span>

              {assignees.length === 0 ? (
                <p className="text-sm text-secondary dark:text-slate-400">
                  {t('assignees.nobodyAssigned')}
                </p>
              ) : (
                <div className="space-y-2">
                  {assignees.map((assignee) => {
                    const profile =
                      assigneeProfiles[assignee.user_id];

                    const name = profile?.name || t('assignees.unknownUser');

                    const assignedByMe =
                      assignee.assigned_by === currentUserId;

                    return (
                      <div
                        key={assignee.user_id}
                        className="flex items-center justify-between rounded-lg border border-border-gray px-4 py-3 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          {profile?.url_picture ? (
                            <img
                              src={profile.url_picture}
                              alt={name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-gray text-sm font-bold text-primary dark:bg-slate-700 dark:text-slate-100">
                              {getInitials(name)}
                            </div>
                          )}

                          <div>
                            <p className="font-medium text-primary dark:text-slate-100">
                              {name}
                            </p>

                            <p className="text-xs text-secondary dark:text-slate-400">
                              {assignedByMe
                                ? t('assignees.selfSigned')
                                : t('assignees.assignedByOther')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {assignee.user_id === currentUserId && (
                            <span className="text-xs font-semibold text-secondary dark:text-slate-400">
                              {t('common:you')}
                            </span>
                          )}

                          {canAssign && (
                            <button
                              type="button"
                              onClick={async () => {
                                await removeAssigneeFromTask({
                                  taskId: task.id,
                                  userId: assignee.user_id,
                                });
                              }}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              {t('common:remove')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canAssign && (
                <button
                  type="button"
                  onClick={() =>
                    setIsEmployeePickerOpen(true)
                  }
                  className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  {t('card.addEmployeeShort')}
                </button>
              )}
            </div>

            {/* MATERIALER */}
            <div className="mb-6">
              <span className="mb-3 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
                {t('materials.heading')}
              </span>

              <TaskMaterialsList taskId={task.id} canManage={canUpdate} taskStatus={task.status} />

              {canUpdate && <TaskItemPicker taskId={task.id} />}
            </div>

            {/* DATOER */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
                  {t('fields.startDate')}
                </span>

                <span className="mt-1 block font-medium text-primary dark:text-slate-100">
                  {formatFullDate(task.start_date)}
                </span>
              </div>

              <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
                  {t('fields.endDate')}
                </span>

                <span className="mt-1 block font-medium text-primary dark:text-slate-100">
                  {formatFullDate(task.end_date)}
                </span>
              </div>
            </div>
          </div>

            {/* HANDLINGER */}
            <div className="flex justify-end border-t border-border-gray p-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  closeDetails();
                }}
                className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                {t('common:close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE PICKER */}
      {isEmployeePickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsEmployeePickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border-gray bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary dark:text-slate-100">
                  {t('assignees.addEmployee')}
                </h3>

                <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                  {t('assignees.chooseWho')}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsEmployeePickerOpen(false)
                }
                className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
              >
                X
              </button>
            </div>

            {/* ANTAL ANSVARLIGE */}
            <div className="mb-4 rounded-lg bg-bg-gray/40 px-4 py-3 dark:bg-slate-900/40">
              <p className="text-sm font-semibold text-secondary dark:text-slate-400">
                Ansvarlige:{' '}
                {task.max_assignees === null
                  ? assignees.length
                  : `${assignees.length} / ${task.max_assignees}`}
              </p>

              {task.max_assignees !== null &&
                assignees.length >= task.max_assignees && (
                  <p className="mt-1 text-xs text-secondary dark:text-slate-400">
                    {t('assignees.maxReached')}
                  </p>
                )}
            </div>

            {/* MEDARBEJDERE */}
            {task.max_assignees !== null &&
              assignees.length >= task.max_assignees ? (
              <p className="py-6 text-center text-sm text-secondary dark:text-slate-400">
                {t('assignees.noFreeSlots')}
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {employees
                  .filter(
                    (employee) =>
                      !assignees.some(
                        (assignee) =>
                          assignee.user_id === employee.id
                      )
                  )
                  .map((employee) => {
                    const name =
                      `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim();

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={async () => {
                          await assignToTask({
                            taskId: task.id,
                            userId: employee.id,
                          });

                          setIsEmployeePickerOpen(false);
                        }}
                        className="w-full rounded-lg border border-border-gray px-4 py-3 text-left transition hover:border-secondary hover:bg-bg-gray dark:border-slate-700 dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          {employee.url_picture ? (
                            <img
                              src={employee.url_picture}
                              alt={
                                name ||
                                employee.email ||
                                t('assignees.employee')
                              }
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-gray text-sm font-bold text-primary dark:bg-slate-700 dark:text-slate-100">
                              {getInitials(
                                name || employee.email || '?'
                              )}
                            </div>
                          )}

                          <div>
                            {(name || employee.email) && (
                              <p className="font-medium text-primary dark:text-slate-100">
                                {name || employee.email}
                              </p>
                            )}

                            {employee.email && (
                              <p className="text-xs text-secondary dark:text-slate-400">
                                {employee.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                {employees.filter(
                  (employee) =>
                    !assignees.some(
                      (assignee) =>
                        assignee.user_id === employee.id
                    )
                ).length === 0 && (
                    <p className="py-4 text-center text-sm text-secondary dark:text-slate-400">
                      {t('assignees.nobodyToAssign')}
                    </p>
                  )}
              </div>
            )}

            {/* LUK */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setIsEmployeePickerOpen(false)
                }
                className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                {t('common:close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <EditTaskModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        task={task}
        canUpdate={canUpdate}
        canDelete={canDelete}
        assigneeNames={assignees.map((a) => assigneeProfiles[a.user_id]?.name || t('assignees.unknownUser'))}
      />
    </>
  );
}