import type { TaskCardProps } from '../../types/Task/Task';

export function TaskCard({ task, onJoin }: TaskCardProps) {
  const getPriorityColor = (priority: TaskCardProps['task']['priority']) => {
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
    <div className="bg-white border-2 border-gray-300 rounded-xl p-5 shadow-sm w-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-xl">{task.title}</h3>
      </div>

      <div className="bg-[#f1f3f5] border border-gray-200 rounded-lg p-4 mb-6 min-h-[100px] relative">
        <span className="absolute -top-3 left-3 bg-[#f1f3f5] px-2 text-xs font-bold text-gray-500 uppercase">
          Info
        </span>

        <p className="text-gray-700 text-sm">{task.description || 'Ingen beskrivelse'}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {task.priority && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(task.priority)}`}>
            Prioritet: {task.priority}
          </span>
        )}

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {task.max_assignees === null ? 'Ingen begrænsning' : `Maks. ${task.max_assignees} personer`}
        </span>
      </div>

      {task.status === 'Started' && onJoin && (
        <button
          onClick={onJoin}
          className="border-2 border-black px-8 py-2 rounded font-bold uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-all"
        >
          Tilmeld
        </button>
      )}
    </div>
  );
}
