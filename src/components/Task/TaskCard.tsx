import { useEffect, useState } from 'react';
import type { TaskCardProps } from '../../types/Task/Task';
import {
  useGetTaskAssigneesQuery,
  useAssignToTaskMutation,
  useUnassignFromTaskMutation,
} from '../../store/apis/taskApi';
import { EditTaskModal } from './EditTaskModal';
import { supabase } from '../../lib/supabase';

export function TaskCard({ task }: TaskCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: assignees = [] } = useGetTaskAssigneesQuery(task.id);

  const [assignToTask] = useAssignToTaskMutation();
  const [unassignFromTask] = useUnassignFromTaskMutation();
  const isAssigned =
    currentUserId !== null && assignees.includes(currentUserId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();

      setCurrentUserId(data.user?.id ?? null);
    };

    getCurrentUser();
  }, []);

  const handleAssignment = async () => {
    if (isAssigned) {
      await unassignFromTask({ taskId: task.id });
    } else {
      await assignToTask({ taskId: task.id });
    }
  };
  const getPriorityColor = (
    priority: TaskCardProps['task']['priority']
  ) => {
    switch (priority) {
      case 'Low':
        return 'bg-green-100 text-green-700';

      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';

      case 'High':
        return 'bg-orange-100 text-orange-700';

      case 'Critical':
        return 'bg-red-100 text-red-700';

      default:
        return 'bg-gray-100 text-gray-700';
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

  return (
    <>
      {/* TASK CARD */}
      <div
        onClick={() => setIsDetailsOpen(true)}
        className="w-full cursor-pointer rounded-xl border-2 border-gray-300 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        {/* HEADER */}
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-xl font-bold">{task.title}</h3>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditOpen(true);
            }}
            className="text-blue-500 hover:text-blue-700"
          >
            Rediger
          </button>
        </div>

        {/* BESKRIVELSE */}
        <div className="relative mb-5 min-h-[100px] rounded-lg border border-gray-200 bg-[#f1f3f5] p-4">
          <span className="absolute -top-3 left-3 bg-[#f1f3f5] px-2 text-xs font-bold uppercase text-gray-500">
            Info
          </span>

          <p className="break-words text-sm text-gray-700 hyphens-auto">
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

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {task.max_assignees === null
              ? 'Ingen begrænsning'
              : `Maks. ${task.max_assignees} personer`}
          </span>
        </div>

        {/* DATOER */}
        <div className="mb-5 flex gap-8 border-t border-gray-200 pt-3 text-sm text-gray-500">
          <div>
            <span className="block text-xs font-semibold uppercase text-gray-400">
              Start
            </span>

            <span className="font-medium text-gray-600">
              {formatDate(task.start_date)}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-gray-400">
              Slut
            </span>

            <span className="font-medium text-gray-600">
              {formatDate(task.end_date)}
            </span>
          </div>
        </div>

        {/* TILMELD / AFMELD */}
        {task.status === 'Started' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAssignment();
            }}
            className={`rounded border-2 px-8 py-2 text-xs font-bold uppercase tracking-widest transition-all ${isAssigned
              ? 'border-red-300 text-red-600 hover:bg-red-600 hover:text-white'
              : 'border-black hover:bg-black hover:text-white'
              }`}
          >
            {isAssigned ? 'Afmeld' : 'Tilmeld'}
          </button>
        )}
      </div>

      {/* TASK DETAILS POPUP */}
      {isDetailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsDetailsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {task.title}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Opgavedetaljer
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="text-gray-500 hover:text-gray-900"
              >
                X
              </button>
            </div>

            {/* BESKRIVELSE */}
            <div className="mb-5 rounded-lg border border-gray-200 bg-[#f1f3f5] p-4">
              <span className="mb-2 block text-xs font-bold uppercase text-gray-500">
                Beskrivelse
              </span>

              <p className="break-words text-sm text-gray-700">
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

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {task.max_assignees === null
                  ? 'Ingen begrænsning'
                  : `Maks. ${task.max_assignees} personer`}
              </span>
            </div>

            {/* DATOER */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <span className="block text-xs font-semibold uppercase text-gray-400">
                  Startdato
                </span>

                <span className="mt-1 block font-medium text-gray-700">
                  {formatFullDate(task.start_date)}
                </span>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <span className="block text-xs font-semibold uppercase text-gray-400">
                  Slutdato
                </span>

                <span className="mt-1 block font-medium text-gray-700">
                  {formatFullDate(task.end_date)}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700"
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
      />
    </>
  );
}