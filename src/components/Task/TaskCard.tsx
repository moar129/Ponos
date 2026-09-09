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

  return (
    <>
      <div className="bg-white border-2 border-gray-300 rounded-xl p-5 shadow-sm w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-xl">{task.title}</h3>

          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="text-blue-500 hover:text-blue-700"
          >
            Rediger
          </button>
        </div>

        <div className="bg-[#f1f3f5] border border-gray-200 rounded-lg p-4 mb-6 min-h-[100px] relative">
          <span className="absolute -top-3 left-3 bg-[#f1f3f5] px-2 text-xs font-bold text-gray-500 uppercase">
            Info
          </span>

          <p className="text-gray-700 text-sm break-words hyphens-auto">
            {task.description || 'Ingen beskrivelse'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
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

        {task.status === 'Started' && (
          <button
            type="button"
            onClick={handleAssignment}
            className={`border-2 px-8 py-2 rounded font-bold uppercase text-xs tracking-widest transition-all ${isAssigned
                ? 'border-red-300 text-red-600 hover:bg-red-600 hover:text-white'
                : 'border-black hover:bg-black hover:text-white'
              }`}
          >
            {isAssigned ? 'Afmeld' : 'Tilmeld'}
          </button>
        )}
      </div>

      <EditTaskModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)} task={task}
      />
    </>
  );
}