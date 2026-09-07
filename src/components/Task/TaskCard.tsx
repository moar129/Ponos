import type { TaskCardProps } from '../../types/Task/Task';

export function TaskCard({ task, onJoin }: TaskCardProps) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl p-5 shadow-sm w-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-xl">{task.title}</h3>
        <div
          className="w-4 h-4 rounded-full mt-1 shrink-0"
          style={{ backgroundColor: task.priorityColor || '#ff4d4d' }}
        />
      </div>

      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6 min-h-[100px] relative">
        <span className="absolute -top-3 left-3 bg-gray-100 px-2 text-xs font-bold text-gray-500 uppercase">
          Info
        </span>
        <p className="text-gray-700 text-sm">{task.description || 'Ingen beskrivelse'}</p>
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