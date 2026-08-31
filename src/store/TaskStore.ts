import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task, ETaskStatus } from '../types/Task/Task';
import { supabase } from '../lib/supabase';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  userOrgId: string | null; // Jens vælger værdi i null 
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  error: null,
  userOrgId: null, 
};


  //READ - Hent opgaver
export const fetchTasks = createAsyncThunk<Task[], string>(
  'tasks/fetchTasks',
  async (orgId) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('organisation_id', orgId);

    if (error) throw new Error(error.message);
    return data as Task[];
  }
);

/**
 * UPDATE - Flyt opgave
 */
export const updateTaskStatus = createAsyncThunk<Task, { id: string, status: ETaskStatus }>(
  'tasks/updateStatus',
  async ({ id, status }) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Task;
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Når auth er gennemført, kør: dispatch(setOrgId(id)) - sørg for at id er organisation_id fra supabase auth
    setOrgId: (state, action: PayloadAction<string | null>) => {
      state.userOrgId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; })
      .addCase(fetchTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Fejl ved hentning af opgaver';
      })
      .addCase(updateTaskStatus.fulfilled, (state, action: PayloadAction<Task>) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
      });
  },
});

export const { setOrgId } = taskSlice.actions;
export const store = configureStore({
  reducer: { taskStore: taskSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;