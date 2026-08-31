import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// Tilføj 'type' foran RootState og AppDispatch
import type { RootState, AppDispatch } from '../../store/TaskStore';
import { fetchTasks, updateTaskStatus } from '../../store/TaskStore';
import { TaskCard } from '../../components/Task/TaskCard';

export const TasksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  // Fjern 'error' herfra hvis den ikke bruges
  const { tasks, userOrgId, loading } = useSelector((state: RootState) => state.taskStore);

  useEffect(() => {
    if (userOrgId) dispatch(fetchTasks(userOrgId));
  }, [userOrgId, dispatch]);

  const handleJoinTask = (taskId: string) => {
    dispatch(updateTaskStatus({ id: taskId, status: 'InProgress' }));
  };

  if (loading) return <div className="p-10 text-center font-bold">Henter opgaver...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      <header className="bg-white border-b-2 p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 italic">
            <span>🔍</span>
            <input type="text" placeholder="Søg" className="border-b border-black outline-none w-32" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-10 h-7 border border-gray-300 rounded shadow-sm"></div>
            ))}
            <button className="text-2xl font-light">+</button>
          </div>
        </div>
        <div className="flex items-center gap-3 italic">
          <span className="underline font-medium">Bruger+</span>
          <div className="w-10 h-10 bg-gray-200 rounded-full border border-gray-400"></div>
        </div>
      </header>

      <main className="flex-1 flex p-10 gap-12 overflow-x-auto items-start">
        <section className="w-80 flex-shrink-0">
          <h2 className="text-xl font-bold mb-8 italic underline decoration-gray-300">Opg tilgængelig</h2>
          <div className="flex flex-col gap-8">
            {tasks.filter(t => t.status === 'Started').map(task => (
              <TaskCard key={task.id} task={task} onJoin={() => handleJoinTask(task.id)} />
            ))}
          </div>
        </section>

        <section className="w-80 flex-shrink-0 text-center italic">
          <h2 className="text-xl font-bold mb-8 underline decoration-gray-300">I gang</h2>
          <div className="flex flex-col gap-8">
            {tasks.filter(t => t.status === 'InProgress').map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        <aside className="ml-auto w-72 mt-auto mb-10">
          <div className="bg-white border-2 border-gray-300 rounded-[40px] p-8 shadow-md">
            <h3 className="font-bold text-center mb-6 text-lg">Filter og Sortering</h3>
            <div className="h-44 border border-dashed border-gray-300 rounded-3xl mb-6"></div>
            <button className="w-full bg-[#333] text-white py-3 rounded-2xl font-bold text-[10px] tracking-widest uppercase">Sort</button>
          </div>
        </aside>
      </main>

      <footer className="bg-white border-t-2 p-8 italic text-gray-400">
        (kontakt information. om os. f: Blå/Bronze)
      </footer>
    </div>
  );
};