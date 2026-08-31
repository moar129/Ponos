import React from 'react';
import type { Task } from '../../types/Task/Task';

interface Props {
  task: Task;
  onJoin?: () => void;
}

export const TaskCard: React.FC<Props> = ({ task, onJoin }) => {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-xl p-5 shadow-sm w-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-xl">Titel</h3>
        <div 
          className="w-4 h-4 rounded-full mt-1" 
          style={{ backgroundColor: task.priorityColor || '#ff4d4d' }}
        />
      </div>

      <div className="bg-[#f1f3f5] border border-gray-200 rounded-lg p-4 mb-6 min-h-[100px] relative">
        <span className="absolute -top-3 left-3 bg-[#f1f3f5] px-2 text-xs font-bold text-gray-500 uppercase">
          info
        </span>
        <p className="text-gray-700 italic text-sm">
          {task.description || task.title}
        </p>
      </div>

      {task.status === 'Started' && onJoin && (
        <button 
          onClick={onJoin}
          className="border-2 border-black px-8 py-1 rounded font-bold uppercase text-xs tracking-widest hover:bg-black hover:text-white transition-all"
        >
          Tilmeld
        </button>
      )}
    </div>
  );
};