import { supabaseApi } from './supabaseApi';
import { supabase } from '../../lib/supabase';
import type {
  DataLayerCat,
  DataLayerItem,
  ItemLocation,
  RawCategory,
} from '../../types/dataLayer/datalayerTypes';

function buildCategoryTree(
  rawCategories: RawCategory[],
  items: DataLayerItem[],
  parentId: string | null = null
): DataLayerCat[] {
  return rawCategories
    .filter((cat) => cat.parent_category_id === parentId)
    .sort((a, b) => a.rank - b.rank)
    .map((cat) => ({
      id: cat.id,
      title: cat.title,
      rank: cat.rank,
      organisationId: cat.organisation_id,
      items: items.filter((item) => item.categoryId === cat.id),
      subCategories: buildCategoryTree(rawCategories, items, cat.id),
    }));
}

function flattenCategoryIds(cat: DataLayerCat): { type: 'Category' | 'Item'; id: string }[] {
  return [
    { type: 'Category' as const, id: cat.id },
    ...cat.items.map((item) => ({ type: 'Item' as const, id: item.id })),
    ...cat.subCategories.flatMap(flattenCategoryIds),
  ];
}

async function getAuthenticatedOrganisationId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Du skal være logget ind for at udføre denne handling.');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('active_organisation_id')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profileData?.active_organisation_id) {
    throw new Error('Kunne ikke hente din organisationstilknytning.');
  }

  return profileData.active_organisation_id;
}

export const categoryApi = supabaseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategoryTree: builder.query<DataLayerCat[], void>({
      queryFn: async () => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data: rawCategories, error: catError } = await supabase
            .from('data_layer_categories')
            .select('id, title, rank, parent_category_id, organisation_id')
            .eq('organisation_id', organisationId);

          if (catError) {
            return { error: { status: 'CUSTOM_ERROR', error: catError.message } };
          }

          const { data: rawItems, error: itemError } = await supabase
            .from('data_layer_items')
            .select('id, location_id, organisation_id, category_id, name, description, quantity, status')
            .eq('organisation_id', organisationId);

          if (itemError) {
            return { error: { status: 'CUSTOM_ERROR', error: itemError.message } };
          }

          const items: DataLayerItem[] = (rawItems ?? []).map((i) => ({
            id: i.id,
            itemLocationId: i.location_id,
            organisationId: i.organisation_id,
            categoryId: i.category_id,
            name: i.name,
            description: i.description,
            quantity: i.quantity,
            itemStatus: i.status,
          }));

          return {
            data: buildCategoryTree(rawCategories ?? [], items),
          };
        } catch (err: any) {
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved hentning af data' } };
        }
      },

      providesTags: (result) =>
        result
          ? [
              { type: 'Category' as const, id: 'LIST' },
              { type: 'Item' as const, id: 'LIST' },
              ...result.flatMap((cat) => flattenCategoryIds(cat)),
            ]
          : [{ type: 'Category' as const, id: 'LIST' }],
    }),

    addCategory: builder.mutation< string, 
    { title: string; parentId: string | null; rank: number } >
    ({
      queryFn: async ({ title, parentId, rank }) => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('data_layer_categories')
            .insert({
              title,
              organisation_id: organisationId,
              parent_category_id: parentId,
              rank,
            })
            .select('id')
            .single();

          if (error) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }

          return { data: data.id };
        } catch (err: any) {
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved oprettelse' } };
        }
      },
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<void, { id: string; title?: string; rank?: number }>({
      queryFn: async ({ id, ...changes }) => {
        const { error } = await supabase.from('data_layer_categories').update(changes).eq('id', id);

        if (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Category', id }],
    }),

    deleteCategory: builder.mutation<void, { id: string }>({
      queryFn: async ({ id }) => {
        const { error } = await supabase.from('data_layer_categories').delete().eq('id', id);

        if (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }

        return { data: undefined };
      },
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    addItem: builder.mutation<string, Omit<DataLayerItem, 'id' | 'organisationId'>>({
      queryFn: async (item) => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('data_layer_items')
            .insert({
              location_id: item.itemLocationId || null,
              organisation_id: organisationId,
              category_id: item.categoryId,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              status: item.itemStatus,
            })
            .select('id')
            .single();

          if (error) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }

          return { data: data.id };
        } catch (err: any) {
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved oprettelse af item' } };
        }
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    addItems: builder.mutation<string[], Omit<DataLayerItem, 'id' | 'organisationId'>[]>({
      queryFn: async (items) => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('data_layer_items')
            .insert(
              items.map((item) => ({
                location_id: item.itemLocationId || null,
                organisation_id: organisationId,
                category_id: item.categoryId,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                status: item.itemStatus,
              }))
            )
            .select('id');

          if (error) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }

          return { data: (data ?? []).map((row) => row.id) };
        } catch (err: any) {
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved oprettelse af items' } };
        }
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    updateItem: builder.mutation<void, Partial<DataLayerItem> & { id: string }>({
      queryFn: async ({ id, itemLocationId, categoryId, itemStatus, ...rest }) => {
        const { error } = await supabase
          .from('data_layer_items')
          .update({
            ...rest,
            ...(itemLocationId !== undefined && { location_id: itemLocationId }),
            ...(categoryId !== undefined && { category_id: categoryId }),
            ...(itemStatus !== undefined && { status: itemStatus }),
          })
          .eq('id', id);

        if (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Item', id }],
    }),

    deleteItem: builder.mutation<void, { id: string }>({
      queryFn: async ({ id }) => {
        const { error } = await supabase.from('data_layer_items').delete().eq('id', id);

        if (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }

        return { data: undefined };
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    getItemLocations: builder.query<ItemLocation[], void>({
      queryFn: async () => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('locations')
            .select('id, name, description, address, organisation_id')
            .eq('organisation_id', organisationId);

          if (error) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }

          const locations: ItemLocation[] = (data ?? []).map((loc) => ({
            id: loc.id,
            organisationId: loc.organisation_id,
            name: loc.name,
            description: loc.description,
            address: loc.address,
          }));

          return { data: locations };
        } catch (err: any) {
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved hentning af lokationer' } };
        }
      },
      providesTags: (result) =>
        result
          ? [
              { type: 'ItemLocation' as const, id: 'LIST' },
              ...result.map((loc) => ({ type: 'ItemLocation' as const, id: loc.id })),
            ]
          : [{ type: 'ItemLocation' as const, id: 'LIST' }],
    }),

    addLocation: builder.mutation<string, { name: string; description?: string | null; address?: string | null }>({
      queryFn: async (location) => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('locations')
            .insert({
              organisation_id: organisationId,
              name: location.name,
              description: location.description ?? null,
              address: location.address ?? null,
            })
            .select('id')
            .single();

          if (error) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }

          return { data: data.id };
        } catch (err: any) {
          return { error: { status: 'CUSTOM_ERROR', error: err.message || 'Fejl ved oprettelse af lokation' } };
        }
      },
      invalidatesTags: [{ type: 'ItemLocation', id: 'LIST' }],
    }),

    updateLocation: builder.mutation<void, { id: string; name?: string; description?: string | null; address?: string | null }>({
      queryFn: async ({ id, ...changes }) => {
        const { error } = await supabase.from('locations').update(changes).eq('id', id);

        if (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ItemLocation', id },
        { type: 'ItemLocation', id: 'LIST' },
      ],
    }),

    deleteLocation: builder.mutation<void, { id: string }>({
      queryFn: async ({ id }) => {
        const { error } = await supabase.from('locations').delete().eq('id', id);

        if (error) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }

        return { data: undefined };
      },
      invalidatesTags: [{ type: 'ItemLocation', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCategoryTreeQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useAddItemMutation,
  useAddItemsMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetItemLocationsQuery,
  useAddLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} = categoryApi;