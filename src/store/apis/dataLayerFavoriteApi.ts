import { supabaseApi } from './supabaseApi';
import { supabase } from '../../lib/supabase';
import { mapDbError, mapPermissionError } from './apiError';
import { getAuthenticatedOrganisationId } from './categoryApi';
import type { DataLayerFavorite, DataLayerFavoriteTarget } from '../../types/dataLayer/datalayerTypes';

// Personlige favoritter på /datalager (data_layer_favorites). RLS begrænser
// til egne rækker i aktiv org, så delete kan ske på målet (category_id/
// location_id) i stedet for rækkens id - dermed virker "fjern" også mens
// en optimistisk tilføjet favorit endnu ikke har fået sit rigtige id.
function targetColumn(target: DataLayerFavoriteTarget): { column: 'category_id' | 'location_id'; id: string } {
  return 'categoryId' in target
    ? { column: 'category_id', id: target.categoryId }
    : { column: 'location_id', id: target.locationId };
}

function matchesTarget(fav: DataLayerFavorite, target: DataLayerFavoriteTarget): boolean {
  return 'categoryId' in target ? fav.categoryId === target.categoryId : fav.locationId === target.locationId;
}

export const dataLayerFavoriteApi = supabaseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDataLayerFavorites: builder.query<DataLayerFavorite[], void>({
      queryFn: async () => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('data_layer_favorites')
            .select('id, category_id, location_id')
            .eq('organisation_id', organisationId);

          if (error) {
            return { error: mapDbError(error) };
          }

          return {
            data: (data ?? []).map((row) => ({
              id: row.id,
              categoryId: row.category_id,
              locationId: row.location_id,
            })),
          };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      providesTags: [{ type: 'DataLayerFavorite', id: 'LIST' }],
    }),

    addDataLayerFavorite: builder.mutation<void, DataLayerFavoriteTarget>({
      queryFn: async (target) => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();
          const { column, id } = targetColumn(target);

          const { error } = await supabase
            .from('data_layer_favorites')
            .insert({ organisation_id: organisationId, [column]: id });

          if (error) {
            return { error: mapPermissionError(error, 'favoriteDatalayer') };
          }

          return { data: undefined };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      // Optimistisk: stjernen skifter med det samme; rulles tilbage ved fejl.
      async onQueryStarted(target, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          dataLayerFavoriteApi.util.updateQueryData('getDataLayerFavorites', undefined, (draft) => {
            if (draft.some((fav) => matchesTarget(fav, target))) return;
            draft.push({
              id: `optimistic-${crypto.randomUUID()}`,
              categoryId: 'categoryId' in target ? target.categoryId : null,
              locationId: 'locationId' in target ? target.locationId : null,
            });
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'DataLayerFavorite', id: 'LIST' }],
    }),

    removeDataLayerFavorite: builder.mutation<void, DataLayerFavoriteTarget>({
      queryFn: async (target) => {
        const { column, id } = targetColumn(target);
        const { error } = await supabase.from('data_layer_favorites').delete().eq(column, id);

        if (error) {
          return { error: mapPermissionError(error, 'favoriteDatalayer') };
        }

        return { data: undefined };
      },
      async onQueryStarted(target, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          dataLayerFavoriteApi.util.updateQueryData('getDataLayerFavorites', undefined, (draft) =>
            draft.filter((fav) => !matchesTarget(fav, target)),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: [{ type: 'DataLayerFavorite', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetDataLayerFavoritesQuery,
  useAddDataLayerFavoriteMutation,
  useRemoveDataLayerFavoriteMutation,
} = dataLayerFavoriteApi;
