import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task, ETaskStatus } from '../../types/Task/Task';
import { supabase } from '../../lib/supabase';
import type { Room, TaskState } from '../../types/Task/Task';

const PROTOTYPE_ORG_ID = '11111111-1111-4111-8111-111111111111';

const isValidUuid = (value: string | null): value is string => {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const getEffectiveOrgId = (value: string | null): string => {
  if (isValidUuid(value)) {
    return value;
  }

  return PROTOTYPE_ORG_ID;
};

const initialState: TaskState = {
  tasks: [],
  rooms: [],
  loading: false,
  error: null,
  userOrgId: PROTOTYPE_ORG_ID,
};


// =========================
// TASKS
// =========================

// READ - Hent opgaver
export const fetchTasks = createAsyncThunk<Task[], string>(
  'tasks/fetchTasks',
  async (orgId) => {
    const effectiveOrgId = getEffectiveOrgId(orgId);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('organisation_id', effectiveOrgId);

    if (error) {
      throw new Error(error.message);
    }

    return data as Task[];
  }
);


// UPDATE 
export const updateTaskStatus = createAsyncThunk<
  Task,
  { id: string; status: ETaskStatus }
>(
  'tasks/updateStatus',
  async ({ id, status }) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Task;
  }
);


// =========================
// ROOMS
// =========================

// READ - Hent rum
export const fetchRooms = createAsyncThunk<Room[], string>(
  'tasks/fetchRooms',
  async (orgId) => {
    const effectiveOrgId = getEffectiveOrgId(orgId);

    const { data, error } = await supabase
      .from('task_rooms')
      .select('*')
      .eq('organisation_id', effectiveOrgId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data as Room[];
  }
);


// CREATE - Opret rum
export const createRoom = createAsyncThunk<
  Room,
  { organisationId: string; name: string }
>(
  'tasks/createRoom',
  async ({ organisationId, name }) => {
    const effectiveOrgId = getEffectiveOrgId(organisationId);

    const { data, error } = await supabase
      .from('task_rooms')
      .insert({
        organisation_id: effectiveOrgId,
        name: name,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Room;
  }
);


// =========================
// SLICE
// =========================

const taskSlice = createSlice({
  name: 'tasks',

  initialState,

  reducers: {
    setOrgId: (state, action: PayloadAction<string | null>) => {
      state.userOrgId = action.payload;
    },
  },

  extraReducers: (builder) => {

    // -------------------------
    // FETCH TASKS
    // -------------------------

    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
        state.tasks = action.payload;
      })

      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Fejl ved hentning af opgaver';
      });


    // -------------------------
    // UPDATE TASK STATUS
    // -------------------------

    builder
      .addCase(updateTaskStatus.fulfilled, (state, action: PayloadAction<Task>) => {
        const index = state.tasks.findIndex(
          task => task.id === action.payload.id
        );

        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      });


    // -------------------------
    // FETCH ROOMS
    // -------------------------

    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchRooms.fulfilled, (state, action: PayloadAction<Room[]>) => {
        state.loading = false;
        state.rooms = action.payload;
      })

      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Fejl ved hentning af rum';
      });


    // -------------------------
    // CREATE ROOM
    // -------------------------

    builder
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(createRoom.fulfilled, (state, action: PayloadAction<Room>) => {
        state.loading = false;
        state.rooms.push(action.payload);
      })

      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Fejl ved oprettelse af rum';
      });
  },
});


// =========================
// EXPORTS
// =========================

export const { setOrgId } = taskSlice.actions;

export const taskReducer = taskSlice.reducer;
