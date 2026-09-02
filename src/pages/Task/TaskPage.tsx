
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import {
  fetchTasks,
  fetchRooms,
  updateTaskStatus,
  createRoom,
} from '../../store/slices/taskSlices';
import { TaskCard } from '../../components/Task/TaskCard';
import { RoomBar } from '../../components/Task/RoomBar';

export const TasksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { tasks, rooms, userOrgId, loading } = useSelector(
    (state: RootState) => state.task
  );

  const [search, setSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    if (userOrgId) {
      dispatch(fetchTasks(userOrgId));
      dispatch(fetchRooms(userOrgId));
    }
  }, [userOrgId, dispatch]);

  const handleJoinTask = (taskId: string) => {
    dispatch(
      updateTaskStatus({
        id: taskId,
        status: 'InProgress',
      })
    );
  };

  const handleAddRoom = async () => {
  const roomName = newRoomName.trim();
  if (!roomName) {
    return;
  }
  if (!userOrgId) {
    console.error('Ingen organisation fundet');
    return;
  }
  try {
    await dispatch(
      createRoom({
        organisationId: userOrgId,
        name: roomName,
      })
    ).unwrap();
    console.log('Rum blev oprettet!');
    setNewRoomName('');
    setIsAddRoomOpen(false);
  } catch (error) {
    console.error('Kunne ikke oprette rum:', error);
  }
};

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchesRoom =
      selectedRoomId === null || task.room_id === selectedRoomId;

    return matchesSearch && matchesRoom;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <p className="font-semibold">Henter opgaver...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f2] text-[#111827]">
      <header className="bg-[#0B132A] text-white px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold tracking-tight">Ponos</div>

            <nav className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium">
                Opgaver
              </button>
              <button className="px-4 py-2 rounded-lg hover:bg-white/10 text-sm font-medium text-white/70">
                Projekter
              </button>
              <button className="px-4 py-2 rounded-lg hover:bg-white/10 text-sm font-medium text-white/70">
                Kalender
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg opgaver..."
                className="
                  w-56
                  rounded-lg
                  bg-white/10
                  border border-white/10
                  px-4 py-2
                  text-sm
                  placeholder:text-white/40
                  outline-none
                  focus:bg-white/15
                  focus:border-white/30
                "
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm">Bruger</span>

              <div
                className="
                  w-10 h-10
                  rounded-full
                  bg-gray-300
                  border-2 border-white/20
                "
              />
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm">
        <RoomBar
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          onAddRoom={() => setIsAddRoomOpen(true)}
        />
      </div>

      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Opret rum</h3>

            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Skriv navn på rum"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0B132A]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddRoom();
                }
              }}
              autoFocus
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddRoomOpen(false);
                  setNewRoomName('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                Annullér
              </button>

              <button
                type="button"
                onClick={handleAddRoom}
                className="rounded-lg bg-[#0B132A] px-4 py-2 text-sm font-medium text-white"
              >
                Gem rum
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Opgaver</h1>

          <p className="text-gray-500 mt-1">
            Få overblik over arbejdet, der skal udføres.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_1fr_280px] gap-8 items-start">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Opgaver tilgængelige</h2>

              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
                {filteredTasks.filter((task) => task.status === 'Started').length}
              </span>
            </div>

            <div className="bg-gray-200/60 rounded-2xl p-4 min-h-[500px] space-y-4">
              {filteredTasks
                .filter((task) => task.status === 'Started')
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onJoin={() => handleJoinTask(task.id)}
                  />
                ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">I gang</h2>

              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {filteredTasks.filter((task) => task.status === 'InProgress').length}
              </span>
            </div>

            <div className="bg-gray-200/60 rounded-2xl p-4 min-h-[500px] space-y-4">
              {filteredTasks
                .filter((task) => task.status === 'InProgress')
                .map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
            </div>
          </section>

          <aside>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">Filter</h2>

                <button className="text-sm text-gray-400 hover:text-gray-700">
                  Nulstil
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">Status</label>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" />
                    Tilgængelig
                  </label>

                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" />
                    I gang
                  </label>

                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" />
                    Færdig
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3">Prioritet</label>

                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option>Alle</option>
                  <option>Lav</option>
                  <option>Mellem</option>
                  <option>Høj</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Sortér efter</label>

                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option>Nyeste</option>
                  <option>Ældste</option>
                  <option>Prioritet</option>
                  <option>Deadline</option>
                </select>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

