import { supabaseApi } from './supabaseApi';
import { supabase } from '../../lib/supabase';
import { mapDbError, mapPermissionError, runQuery } from './apiError';
import { getActiveOrganisationId } from './session';

// Personlige favoritrum på /tasks (task_room_favorites). RLS begrænser til
// egne rækker i aktiv org, så delete kan ske på room_id - dermed virker
// "fjern" også mens en optimistisk tilføjet favorit endnu ikke er gemt.
export const taskRoomFavoriteApi = supabaseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Returnerer room ids.
    getTaskRoomFavorites: builder.query<string[], void>({
      queryFn: () => runQuery(async () => {
        const organisationId = await getActiveOrganisationId();

        const { data, error } = await supabase
          .from('task_room_favorites')
          .select('room_id')
          .eq('organisation_id', organisationId);

        if (error) {
          return { error: mapDbError(error) };
        }

        return { data: (data ?? []).map((row) => row.room_id as string) };
      }),
      providesTags: [{ type: 'TaskRoomFavorite', id: 'LIST' }],
    }),

    addTaskRoomFavorite: builder.mutation<void, string>({
      queryFn: (roomId) => runQuery(async () => {
        const organisationId = await getActiveOrganisationId();

        const { error } = await supabase
          .from('task_room_favorites')
          .insert({ organisation_id: organisationId, room_id: roomId });

        if (error) {
          return { error: mapPermissionError(error, 'favoriteTasks') };
        }

        return { data: undefined };
      }),
      // Optimistisk: stjernen skifter med det samme; rulles tilbage ved fejl.
      async onQueryStarted(roomId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          taskRoomFavoriteApi.util.updateQueryData('getTaskRoomFavorites', undefined, (draft) => {
            if (!draft.includes(roomId)) draft.push(roomId);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'TaskRoomFavorite', id: 'LIST' }],
    }),

    removeTaskRoomFavorite: builder.mutation<void, string>({
      queryFn: async (roomId) => {
        const { error } = await supabase.from('task_room_favorites').delete().eq('room_id', roomId);

        if (error) {
          return { error: mapPermissionError(error, 'favoriteTasks') };
        }

        return { data: undefined };
      },
      async onQueryStarted(roomId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          taskRoomFavoriteApi.util.updateQueryData('getTaskRoomFavorites', undefined, (draft) =>
            draft.filter((id) => id !== roomId),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'TaskRoomFavorite', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetTaskRoomFavoritesQuery,
  useAddTaskRoomFavoriteMutation,
  useRemoveTaskRoomFavoriteMutation,
} = taskRoomFavoriteApi;
