import { useEffect, useState } from 'react';
import type { TaskCardProps } from '../../types/Task/Task';
import {
  useGetTaskAssigneesQuery,
  useGetOrganisationEmployeesQuery,
  useAssignToTaskMutation,
  useUnassignFromTaskMutation,
  useRemoveAssigneeFromTaskMutation,
} from '../../store/apis/taskApi';
import { EditTaskModal } from './EditTaskModal';
import { supabase } from '../../lib/supabase';

export function TaskCard({ task, canUpdate, canDelete }: TaskCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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

  const [assignToTask] = useAssignToTaskMutation();
  const [unassignFromTask] = useUnassignFromTaskMutation();
  const [removeAssigneeFromTask] =
    useRemoveAssigneeFromTaskMutation();

  const currentAssignee = assignees.find(
    (assignee) => assignee.user_id === currentUserId
  );

  const isAssigned = currentAssignee !== undefined;

  const canUnassignSelf =
    currentAssignee?.assigned_by === currentUserId;

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

    return new Date(date).toLocaleDateString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatFullDate = (date: string | null) => {
    if (!date) return '—';

    return new Date(date).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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
          <h3 className="text-xl font-bold text-primary dark:text-slate-100">{task.title}</h3>

          {canUpdate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditOpen(true);
              }}
              className="text-accent hover:text-accent-hover"
            >
              Rediger
            </button>
          )}
        </div>

        {/* BESKRIVELSE */}
        <div className="relative mb-5 min-h-[100px] rounded-lg border border-border-gray bg-bg-gray/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <span className="absolute -top-3 left-3 bg-white px-2 text-xs font-bold uppercase text-secondary dark:bg-slate-800 dark:text-slate-400">
            Info
          </span>

          <p className="break-words text-sm text-secondary hyphens-auto dark:text-slate-400">
            {task.description || 'Ingen beskrivelse'}
          </p>
        </div>

        {/* BADGES */}
        <div className="mb-4 flex flex-wrap gap-2">
          {task.priority && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(
                task.priority
              )}`}
            >
              Prioritet: {task.priority}
            </span>
          )}

          <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
            {task.max_assignees === null
              ? 'Ingen begrænsning'
              : `Maks. ${task.max_assignees} personer`}
          </span>
        </div>

        {/* ANSVARLIGE */}
        <div className="mb-6">
          <span className="mb-3 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
            Ansvarlige
          </span>

          {assignees.length === 0 ? (
            <p className="text-sm text-secondary dark:text-slate-400">
              Ingen er tildelt endnu.
            </p>
          ) : (
            <div className="space-y-2">
              {assignees.map((assignee) => {
                const profile =
                  assigneeProfiles[assignee.user_id];

                const name = profile?.name || 'Ukendt bruger';

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
                            ? 'Tilmeldt af dig'
                            : 'Tildelt af en anden'}
                        </p>
                      </div>
                    </div>

                    {assignee.user_id === currentUserId && (
                      <span className="text-xs font-semibold text-secondary dark:text-slate-400">
                        Dig
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
              Start
            </span>

            <span className="font-medium text-primary dark:text-slate-100">
              {formatDate(task.start_date)}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
              Slut
            </span>

            <span className="font-medium text-primary dark:text-slate-100">
              {formatDate(task.end_date)}
            </span>
          </div>
        </div>

        {/* TILMELD / AFMELD */}
        {task.status === 'Started' && (
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
      </div>

      {/* TASK DETAILS POPUP */}
      {isDetailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setIsDetailsOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary dark:text-slate-100">
                  {task.title}
                </h2>

                <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                  Opgavedetaljer
                </p>
              </div>

              {/* LUK */}
              <button
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                }}
                className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
              >
                X
              </button>
            </div>

            {/* BESKRIVELSE */}
            <div className="mb-5 rounded-lg border border-border-gray bg-bg-gray/40 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <span className="mb-2 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
                Beskrivelse
              </span>

              <p className="break-words text-sm text-secondary dark:text-slate-400">
                {task.description || 'Ingen beskrivelse'}
              </p>
            </div>

            {/* PRIORITET + PERSONER */}
            <div className="mb-5 flex flex-wrap gap-2">
              {task.priority && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  Prioritet: {task.priority}
                </span>
              )}

              <span className="rounded-full bg-bg-gray px-3 py-1 text-xs font-semibold text-secondary dark:bg-slate-700 dark:text-slate-400">
                {task.max_assignees === null
                  ? 'Ingen begrænsning'
                  : `Maks. ${task.max_assignees} personer`}
              </span>
            </div>

            {/* ANSVARLIGE */}
            <div className="mb-6">
              <span className="mb-3 block text-xs font-bold uppercase text-secondary dark:text-slate-400">
                Ansvarlige
              </span>

              {assignees.length === 0 ? (
                <p className="text-sm text-secondary dark:text-slate-400">
                  Ingen er tildelt endnu.
                </p>
              ) : (
                <div className="space-y-2">
                  {assignees.map((assignee) => {
                    const profile =
                      assigneeProfiles[assignee.user_id];

                    const name = profile?.name || 'Ukendt bruger';

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
                                ? 'Tilmeldt af dig'
                                : 'Tildelt af en anden'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {assignee.user_id === currentUserId && (
                            <span className="text-xs font-semibold text-secondary dark:text-slate-400">
                              Dig
                            </span>
                          )}

                          {canUpdate && (
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
                              Fjern
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canUpdate && (
                <button
                  type="button"
                  onClick={() => setIsEmployeePickerOpen(true)}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  + Tilføj medarbejder
                </button>
              )}
            </div>

            {/* DATOER */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
                  Startdato
                </span>

                <span className="mt-1 block font-medium text-primary dark:text-slate-100">
                  {formatFullDate(task.start_date)}
                </span>
              </div>

              <div className="rounded-lg border border-border-gray p-4 dark:border-slate-700">
                <span className="block text-xs font-semibold uppercase text-secondary dark:text-slate-400">
                  Slutdato
                </span>

                <span className="mt-1 block font-medium text-primary dark:text-slate-100">
                  {formatFullDate(task.end_date)}
                </span>
              </div>
            </div>

            {/* HANDLINGER */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                }}
                className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Luk
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
            className="w-full max-w-md rounded-xl bg-white border border-border-gray p-6 shadow-xl dark:bg-slate-800 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary dark:text-slate-100">
                  Tilføj medarbejder
                </h3>

                <p className="mt-1 text-sm text-secondary dark:text-slate-400">
                  Vælg hvem der skal tildeles opgaven
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEmployeePickerOpen(false)}
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
                    Maksimalt antal medarbejdere er nået.
                  </p>
                )}
            </div>

            {/* MEDARBEJDERE */}
            {task.max_assignees !== null &&
              assignees.length >= task.max_assignees ? (
              <p className="py-6 text-center text-sm text-secondary dark:text-slate-400">
                Der er ikke flere ledige pladser på opgaven.
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
                              alt={name || employee.email || 'Medarbejder'}
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
                      Der er ingen medarbejdere at tildele.
                    </p>
                  )}
              </div>
            )}

            {/* LUK */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEmployeePickerOpen(false)}
                className="rounded-lg bg-bg-gray px-5 py-2 text-sm font-semibold text-primary hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Luk
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
      />
    </>
  );
}
