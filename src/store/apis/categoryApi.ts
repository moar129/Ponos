import { supabaseApi } from './supabaseApi';
import { supabase } from '../../lib/supabase';
import { mapDbError, mapPermissionError } from './apiError';
import type {
  AvailableUnitLocation,
  DataLayerCat,
  DataLayerItem,
  ItemLocation,
  ItemStatus,
  ItemUnit,
  RawCategory,
  UnitLocationCount,
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
      parentCategoryId: parentId,
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

export async function getAuthenticatedOrganisationId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('errors:loginRequiredForAction');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('active_organisation_id')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profileData?.active_organisation_id) {
    throw new Error('errors:organisationLookupFailed');
  }

  return profileData.active_organisation_id;
}

interface AddItemInput {
  categoryId: string;
  itemLocationId?: string | null;
  name: string;
  description?: string | null;
  packaging?: string | null;
  unitOfMeasurement: string;
  quantity: number;
  itemStatus: ItemStatus;
  isDiscrete: boolean;
  // Hver af de N oprettede enheder får sit EGET contentsTotal/
  // contentsRemaining = contentsTotal (fx 12 for en 12-pack) - ingen
  // delt pulje mellem enhederne. quantity styrer fortsat kun hvor mange
  // enheder der oprettes (fx 5 kasser).
  contentsTotal?: number;
  // Kun relevant når contentsTotal er sat - null/undefined = ingen
  // automatisk statusskift ved den tærskel. Se sync_status_from_contents
  // i docs/dbSchema.sql §15.21.
  contentsEmptyStatus?: ItemStatus | null;
  contentsPartialStatus?: ItemStatus | null;
  contentsFullStatus?: ItemStatus | null;
  // Kun relevant når !isDiscrete && contentsTotal er sat (Målt mængde +
  // kapacitet, fx en tank) - startniveau pr. oprettet beholder.
  // null/undefined = start fuld (= contentsTotal).
  contentsStart?: number | null;
  // Kun relevant når !isDiscrete && !contentsTotal (Mængde) - "1
  // [packaging] = packageSize [unitOfMeasurement]" (fx "1 big bag = 500
  // kg"), item-egenskab.
  packageSize?: number | null;
  serialNumbers?: string[];
}

// 23505 = Postgres unique constraint violation. Rammer her kun
// idx_item_units_serial_item (serienummer skal være unikt pr. item) -
// den rå Postgres-fejl har intet hint, så den kan ikke gå gennem
// mapDbError; mappes derfor direkte, samme mønster som
// organisationApi.ts/roleApi.ts/privilegeApi.ts/membershipApi.ts bruger
// til deres egne dublet-fejl.
function mapItemUnitError(error: { code?: string; hint?: string | null; message: string }, actionKey: string) {
  if (error.code === '23505') {
    return { status: 'CUSTOM_ERROR' as const, error: 'errors:duplicateSerialNumber' };
  }
  return mapPermissionError(error, actionKey);
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
            return { error: mapDbError(catError) };
          }

          const { data: rawItems, error: itemError } = await supabase
            .from('data_layer_items')
            .select('id, location_id, organisation_id, category_id, name, description, packaging, unit_of_measurement, package_size')
            .eq('organisation_id', organisationId);

          if (itemError) {
            return { error: mapDbError(itemError) };
          }

          const itemIds = (rawItems ?? []).map((i) => i.id);

          // Aggregerede status-tal (view data_layer_item_status_counts) i
          // stedet for de rå enheds-rækker - se docs/dbSchema.sql §9a.
          const { data: rawCounts, error: countsError } =
            itemIds.length > 0
              ? await supabase
                  .from('data_layer_item_status_counts')
                  .select('item_id, status, total_quantity, has_capacity_units')
                  .in('item_id', itemIds)
              : {
                  data: [] as { item_id: string; status: ItemStatus; total_quantity: number; has_capacity_units: boolean }[],
                  error: null,
                };

          if (countsError) {
            return { error: mapDbError(countsError) };
          }

          const countsByItem = new Map<string, Partial<Record<ItemStatus, number>>>();
          const capacityByItem = new Set<string>();
          for (const row of rawCounts ?? []) {
            const status = row.status as ItemStatus;
            const existing = countsByItem.get(row.item_id) ?? {};
            existing[status] = row.total_quantity;
            countsByItem.set(row.item_id, existing);
            if (row.has_capacity_units) capacityByItem.add(row.item_id);
          }

          const items: DataLayerItem[] = (rawItems ?? []).map((i) => {
            const statusCounts = countsByItem.get(i.id) ?? {};
            const quantity = Object.values(statusCounts).reduce((sum: number, n) => sum + (n ?? 0), 0);
            return {
              id: i.id,
              itemLocationId: i.location_id,
              organisationId: i.organisation_id,
              categoryId: i.category_id,
              name: i.name,
              description: i.description,
              packaging: i.packaging,
              unitOfMeasurement: i.unit_of_measurement,
              quantity,
              statusCounts,
              hasCapacityUnits: capacityByItem.has(i.id),
              packageSize: i.package_size,
            };
          });

          return {
            data: buildCategoryTree(rawCategories ?? [], items),
          };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
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
            return { error: mapPermissionError(error, 'createCategory') };
          }

          return { data: data.id };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<void, { id: string; title?: string; rank?: number; parentId?: string | null }>({
      queryFn: async ({ id, parentId, ...changes }) => {
        const { error } = await supabase
          .from('data_layer_categories')
          .update({
            ...changes,
            ...(parentId !== undefined && { parent_category_id: parentId }),
          })
          .eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'updateCategory') };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Category', id }],
    }),

    deleteCategory: builder.mutation<void, { id: string }>({
      queryFn: async ({ id }) => {
        const { error } = await supabase.from('data_layer_categories').delete().eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'deleteCategory') };
        }

        return { data: undefined };
      },
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    // US-42: item + dets enheder oprettes atomisk via RPC (add_item_with_units)
    // i stedet for en rå insert - undgår et item uden enheder, hvis noget
    // fejler undervejs. isDiscrete (eksplicit, IKKE udledt af
    // unitOfMeasurement-teksten - en "dåse" eller "flaske" er lige så
    // meget et enkeltstyk som "stk") -> N enheder à quantity=1 (evt.
    // serienummer pr. enhed); false -> ét batch med quantity=N.
    addItem: builder.mutation<string, AddItemInput>({
      queryFn: async (item) => {
        try {
          const { data, error } = await supabase.rpc('add_item_with_units', {
            p_category_id: item.categoryId,
            p_location_id: item.itemLocationId ?? null,
            p_name: item.name,
            p_description: item.description ?? null,
            p_packaging: item.packaging ?? null,
            p_unit_of_measurement: item.unitOfMeasurement,
            p_quantity: item.quantity,
            p_status: item.itemStatus,
            p_serial_numbers: item.serialNumbers ?? null,
            p_is_discrete: item.isDiscrete,
            p_contents_total: item.contentsTotal ?? null,
            p_contents_empty_status: item.contentsEmptyStatus ?? null,
            p_contents_partial_status: item.contentsPartialStatus ?? null,
            p_contents_full_status: item.contentsFullStatus ?? null,
            p_contents_start: item.contentsStart ?? null,
            p_package_size: item.packageSize ?? null,
          });

          if (error) {
            return { error: mapItemUnitError(error, 'createItem') };
          }

          return { data: data as string };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    // Sekventielle RPC-kald (ikke ét bulk-insert): add_item_with_units
    // håndterer kun ét item ad gangen, da hvert item kan have forskellig
    // unitOfMeasurement/serienummer-slicing. Typisk antal rækker pr. kald
    // fra addItemsComponent.tsx er lavt, så det er ikke et ydelsesproblem.
    addItems: builder.mutation<string[], AddItemInput[]>({
      queryFn: async (items) => {
        try {
          const ids: string[] = [];

          for (const item of items) {
            const { data, error } = await supabase.rpc('add_item_with_units', {
              p_category_id: item.categoryId,
              p_location_id: item.itemLocationId ?? null,
              p_name: item.name,
              p_description: item.description ?? null,
              p_packaging: item.packaging ?? null,
              p_unit_of_measurement: item.unitOfMeasurement,
              p_quantity: item.quantity,
              p_status: item.itemStatus,
              p_serial_numbers: item.serialNumbers ?? null,
              p_is_discrete: item.isDiscrete,
              p_contents_total: item.contentsTotal ?? null,
              p_contents_empty_status: item.contentsEmptyStatus ?? null,
              p_contents_partial_status: item.contentsPartialStatus ?? null,
              p_contents_full_status: item.contentsFullStatus ?? null,
              p_contents_start: item.contentsStart ?? null,
              p_package_size: item.packageSize ?? null,
            });

            if (error) {
              return { error: mapItemUnitError(error, 'createItems') };
            }

            ids.push(data as string);
          }

          return { data: ids };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    // Kun eksplicit hvidlistede felter sendes videre - quantity/statusCounts
    // er afledte og redigeres aldrig direkte her, og et rest-spread ville
    // risikere at sende dem videre til data_layer_items, som ikke har de
    // kolonner længere.
    updateItem: builder.mutation<void, Partial<DataLayerItem> & { id: string }>({
      queryFn: async ({ id, name, description, packaging, unitOfMeasurement, itemLocationId, categoryId, packageSize }) => {
        const { error } = await supabase
          .from('data_layer_items')
          .update({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(packaging !== undefined && { packaging }),
            ...(unitOfMeasurement !== undefined && { unit_of_measurement: unitOfMeasurement }),
            ...(itemLocationId !== undefined && { location_id: itemLocationId }),
            ...(categoryId !== undefined && { category_id: categoryId }),
            ...(packageSize !== undefined && { package_size: packageSize }),
          })
          .eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'updateItem') };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Item', id }],
    }),

    deleteItem: builder.mutation<void, { id: string }>({
      queryFn: async ({ id }) => {
        const { error } = await supabase.from('data_layer_items').delete().eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'deleteItem') };
        }

        return { data: undefined };
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    // Ledig (Available) mængde pr. item pr. lager i hele organisationen -
    // bruges af opgavernes materialevælger til at vise hvor noget ligger,
    // før man vælger. Deler 'Item LIST'-tagget med getCategoryTree, da
    // alle mutationer der ændrer status-fordelingen allerede invaliderer det.
    getAvailableUnitLocations: builder.query<AvailableUnitLocation[], void>({
      queryFn: async () => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('data_layer_item_units')
            .select('item_id, location_id, quantity')
            .eq('organisation_id', organisationId)
            .eq('status', 'Available');

          if (error) {
            return { error: mapDbError(error) };
          }

          const byKey = new Map<string, AvailableUnitLocation>();
          for (const row of data ?? []) {
            const key = `${row.item_id}|${row.location_id ?? ''}`;
            const existing = byKey.get(key);
            if (existing) {
              existing.quantity += Number(row.quantity);
            } else {
              byKey.set(key, { itemId: row.item_id, locationId: row.location_id, quantity: Number(row.quantity) });
            }
          }

          return { data: [...byKey.values()] };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      providesTags: [{ type: 'Item', id: 'LIST' }],
    }),

    // Mængde pr. item pr. lokation pr. status (alle statusser) - enheder kan
    // flyttes enkeltvis, så et item kan ligge flere steder. Bruges af
    // datalager-siden til at vise hvad der ligger hvor. ItemLocation LIST
    // med, da sletning af en lokation sætter enhedernes location_id til null.
    getUnitLocationCounts: builder.query<UnitLocationCount[], void>({
      queryFn: async () => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('data_layer_item_units')
            .select('item_id, location_id, status, quantity')
            .eq('organisation_id', organisationId);

          if (error) {
            return { error: mapDbError(error) };
          }

          const byKey = new Map<string, UnitLocationCount>();
          for (const row of data ?? []) {
            const key = `${row.item_id}|${row.location_id ?? ''}|${row.status}`;
            const existing = byKey.get(key);
            if (existing) {
              existing.quantity += Number(row.quantity);
            } else {
              byKey.set(key, {
                itemId: row.item_id,
                locationId: row.location_id,
                status: row.status as ItemStatus,
                quantity: Number(row.quantity),
              });
            }
          }

          return { data: [...byKey.values()] };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      providesTags: [
        { type: 'Item', id: 'LIST' },
        { type: 'ItemLocation', id: 'LIST' },
      ],
    }),

    getItemUnits: builder.query<ItemUnit[], string>({
      queryFn: async (itemId) => {
        const { data, error } = await supabase
          .from('data_layer_item_units')
          .select('id, item_id, organisation_id, location_id, serial_number, quantity, status, contents_total, contents_remaining, contents_empty_status, contents_partial_status, contents_full_status')
          .eq('item_id', itemId)
          .order('created_at');

        if (error) {
          return { error: mapDbError(error) };
        }

        const units: ItemUnit[] = (data ?? []).map((u) => ({
          id: u.id,
          itemId: u.item_id,
          organisationId: u.organisation_id,
          itemLocationId: u.location_id,
          serialNumber: u.serial_number,
          quantity: u.quantity,
          status: u.status,
          contentsTotal: u.contents_total,
          contentsRemaining: u.contents_remaining,
          contentsEmptyStatus: u.contents_empty_status,
          contentsPartialStatus: u.contents_partial_status,
          contentsFullStatus: u.contents_full_status,
        }));

        return { data: units };
      },
      providesTags: (result, _error, itemId) =>
        result
          ? [
              { type: 'ItemUnit' as const, id: `ITEM-${itemId}` },
              ...result.map((u) => ({ type: 'ItemUnit' as const, id: u.id })),
            ]
          : [{ type: 'ItemUnit' as const, id: `ITEM-${itemId}` }],
    }),

    // Restock - bruges både fra Datalager (itemsDetailComponent) og som
    // "produktion" fra en opgave (fx en skrald-opgave der tilføjer
    // indsamlet materiale). isDiscrete er eksplicit fra kalderen (samme
    // "Enkeltstyk/Målt mængde"-valg som ved oprettelse) - IKKE udledt af
    // unit_of_measurement-teksten, som kun er beskrivende (fx "dåse",
    // "flaske", "kg").
    addItemUnits: builder.mutation<
      void,
      {
        itemId: string;
        quantity: number;
        status: ItemStatus;
        isDiscrete: boolean;
        // Hver oprettet enhed får sit EGET contentsTotal/contentsRemaining
        // = contentsTotal - ingen delt pulje mellem enhederne.
        contentsTotal?: number;
        // Kun relevant når !isDiscrete && contentsTotal er sat (Målt
        // mængde + kapacitet) - startniveau pr. oprettet beholder.
        // null/undefined = start fuld (= contentsTotal).
        contentsStart?: number | null;
        contentsEmptyStatus?: ItemStatus | null;
        contentsPartialStatus?: ItemStatus | null;
        contentsFullStatus?: ItemStatus | null;
        // Kun relevant når !isDiscrete && !contentsTotal (Mængde + pakke-
        // faktor) - quantity er da ANTAL EMBALLAGER, hver får sin egen
        // række med quantity = packageSize.
        packageSize?: number | null;
        serialNumbers?: string[];
        locationId?: string | null;
      }
    >({
      queryFn: async ({
        itemId,
        quantity,
        status,
        isDiscrete,
        contentsTotal,
        contentsStart,
        contentsEmptyStatus,
        contentsPartialStatus,
        contentsFullStatus,
        packageSize,
        serialNumbers,
        locationId,
      }) => {
        try {
          const { data: itemRow, error: itemError } = await supabase
            .from('data_layer_items')
            .select('organisation_id, location_id')
            .eq('id', itemId)
            .single();

          if (itemError || !itemRow) {
            return { error: mapDbError(itemError ?? { message: 'errors:generic' }) };
          }

          const resolvedLocationId = locationId !== undefined ? locationId : itemRow.location_id;
          // Diskret: contentsTotal er indhold pr. enhed (fx 12-pack), sat
          // sammen med contents_remaining. Målt: contentsTotal er
          // KAPACITET (fx en tanks 200 liter) - contents_remaining
          // sættes IKKE, niveauet er quantity selv, se
          // sync_status_from_contents i docs/dbSchema.sql §15.21.
          const contentsValue = isDiscrete && contentsTotal ? contentsTotal : null;
          const capacityValue = !isDiscrete && contentsTotal ? contentsTotal : null;
          const trackedValue = contentsValue ?? capacityValue;
          const emptyStatusValue = trackedValue ? contentsEmptyStatus ?? null : null;
          const partialStatusValue = trackedValue ? contentsPartialStatus ?? null : null;
          const fullStatusValue = trackedValue ? contentsFullStatus ?? null : null;

          const rows = isDiscrete
            ? Array.from({ length: quantity }, (_, i) => ({
                organisation_id: itemRow.organisation_id,
                item_id: itemId,
                location_id: resolvedLocationId,
                serial_number: serialNumbers?.[i]?.trim() || null,
                quantity: 1,
                status,
                contents_total: contentsValue,
                contents_remaining: contentsValue,
                contents_empty_status: emptyStatusValue,
                contents_partial_status: partialStatusValue,
                contents_full_status: fullStatusValue,
              }))
            : capacityValue
            ? // Målt mængde + kapacitet (fx en tank): quantity er ANTAL
              // BEHOLDERE, hver får sin egen række med kapacitet +
              // startniveau (default fuld) - ligesom add_item_with_units,
              // se docs/dbSchema.sql §15.21.
              Array.from({ length: quantity }, () => ({
                organisation_id: itemRow.organisation_id,
                item_id: itemId,
                location_id: resolvedLocationId,
                serial_number: null,
                quantity: contentsStart || capacityValue,
                status,
                contents_total: capacityValue,
                contents_remaining: null,
                contents_empty_status: emptyStatusValue,
                contents_partial_status: partialStatusValue,
                contents_full_status: fullStatusValue,
              }))
            : packageSize
            ? // Mængde + pakke-faktor (fx "1 big bag = 500 kg"): quantity
              // er ANTAL EMBALLAGER, hver får sin egen række med
              // quantity = packageSize - ligesom add_item_with_units.
              Array.from({ length: quantity }, () => ({
                organisation_id: itemRow.organisation_id,
                item_id: itemId,
                location_id: resolvedLocationId,
                serial_number: null,
                quantity: packageSize,
                status,
                contents_total: null,
                contents_remaining: null,
                contents_empty_status: null,
                contents_partial_status: null,
                contents_full_status: null,
              }))
            : [
                {
                  organisation_id: itemRow.organisation_id,
                  item_id: itemId,
                  location_id: resolvedLocationId,
                  serial_number: null,
                  quantity,
                  status,
                  contents_total: null,
                  contents_remaining: null,
                  contents_empty_status: null,
                  contents_partial_status: null,
                  contents_full_status: null,
                },
              ];

          const { error } = await supabase.from('data_layer_item_units').insert(rows);

          if (error) {
            return { error: mapItemUnitError(error, 'addItemUnits') };
          }

          return { data: undefined };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      invalidatesTags: (_result, _error, { itemId }) => [
        { type: 'ItemUnit', id: `ITEM-${itemId}` },
        { type: 'Item', id: itemId },
        { type: 'Item', id: 'LIST' },
      ],
    }),

    updateItemUnit: builder.mutation<
      void,
      {
        id: string;
        itemId: string;
        serialNumber?: string | null;
        status?: ItemStatus;
        itemLocationId?: string | null;
        contentsRemaining?: number;
        // Manuel rettelse af niveauet på en Målt mængde + kapacitet-række
        // (contentsTotal sat, contentsRemaining null - fx en tank), da
        // niveauet ellers kun kan ændres af en opgave. Sammen med
        // contents_total udløser dette sync_status_from_contents
        // (docs/dbSchema.sql §15.21), præcis som contentsRemaining gør for
        // Enkeltstyk+indhold.
        quantity?: number;
      }
    >({
      queryFn: async ({ id, serialNumber, status, itemLocationId, contentsRemaining, quantity }) => {
        const { error } = await supabase
          .from('data_layer_item_units')
          .update({
            ...(serialNumber !== undefined && { serial_number: serialNumber }),
            ...(status !== undefined && { status }),
            ...(itemLocationId !== undefined && { location_id: itemLocationId }),
            ...(contentsRemaining !== undefined && { contents_remaining: contentsRemaining }),
            ...(quantity !== undefined && { quantity }),
          })
          .eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'updateItemUnit') };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { id, itemId }) => [
        { type: 'ItemUnit', id },
        { type: 'ItemUnit', id: `ITEM-${itemId}` },
        { type: 'Item', id: itemId },
        { type: 'Item', id: 'LIST' },
      ],
    }),

    deleteItemUnit: builder.mutation<void, { id: string; itemId: string }>({
      queryFn: async ({ id }) => {
        const { error } = await supabase.from('data_layer_item_units').delete().eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'deleteItemUnit') };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { itemId }) => [
        { type: 'ItemUnit', id: `ITEM-${itemId}` },
        { type: 'Item', id: itemId },
        { type: 'Item', id: 'LIST' },
      ],
    }),

    // Forbrug, Datalager -> Task: systemet vælger/splitter N ledige
    // enheder atomisk (RPC reserve_item_units) - opgaven angiver kun en
    // mængde, aldrig specifikke serienumre.
    // locationId: reservér kun fra dette lager (null = enheder uden lager);
    // udeladt = alle lagre.
    reserveItemUnits: builder.mutation<string, { taskId: string; itemId: string; quantity: number; locationId?: string | null }>({
      queryFn: async ({ taskId, itemId, quantity, locationId }) => {
        const { data, error } = await supabase.rpc('reserve_item_units', {
          p_task_id: taskId,
          p_item_id: itemId,
          p_quantity: quantity,
          p_location_id: locationId ?? null,
          p_restrict_location: locationId !== undefined,
        });

        if (error) {
          return { error: mapPermissionError(error, 'reserveItemUnits') };
        }

        return { data: data as string };
      },
      invalidatesTags: (_result, _error, { taskId, itemId }) => [
        { type: 'ItemUnit', id: `ITEM-${itemId}` },
        { type: 'Item', id: itemId },
        { type: 'Item', id: 'LIST' },
        { type: 'Task', id: taskId },
        { type: 'Task', id: `${taskId}-MATERIALS` },
        { type: 'Task', id: 'LIST' },
      ],
    }),

    // Annullering/fjernelse før færdiggørelse (RPC release_item_units).
    // outcomes = brugerens valgte slutstatus pr. mængde; uden outcomes går
    // kun Reserved/InUse tilbage til Available, andre statusser beholdes.
    releaseItemUnits: builder.mutation<
      void,
      { taskMaterialId: string; itemId: string; taskId: string; outcomes?: { status: ItemStatus; quantity: number }[] }
    >({
      queryFn: async ({ taskMaterialId, outcomes }) => {
        const { error } = await supabase.rpc('release_item_units', {
          p_task_material_id: taskMaterialId,
          p_outcomes: outcomes ?? null,
        });

        if (error) {
          return { error: mapPermissionError(error, 'releaseItemUnits') };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { taskId, itemId }) => [
        { type: 'ItemUnit', id: `ITEM-${itemId}` },
        { type: 'Item', id: itemId },
        { type: 'Item', id: 'LIST' },
        { type: 'Task', id: taskId },
        { type: 'Task', id: `${taskId}-MATERIALS` },
        { type: 'Task', id: 'LIST' },
      ],
    }),

    // Statusskift på en del af en linjes linkede enheder MENS opgaven er
    // InProgress (fx InUse -> Damaged) - linket til opgaven bevares, så
    // materialet stadig skal afrapporteres (RPC update_task_material_status).
    changeTaskMaterialStatus: builder.mutation<
      void,
      { taskMaterialId: string; itemId: string; taskId: string; fromStatus: ItemStatus; quantity: number; status: ItemStatus }
    >({
      queryFn: async ({ taskMaterialId, fromStatus, quantity, status }) => {
        const { error } = await supabase.rpc('update_task_material_status', {
          p_task_material_id: taskMaterialId,
          p_from_status: fromStatus,
          p_quantity: quantity,
          p_status: status,
        });

        if (error) {
          return { error: mapPermissionError(error, 'changeTaskMaterialStatus') };
        }

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { taskId, itemId }) => [
        { type: 'ItemUnit', id: `ITEM-${itemId}` },
        { type: 'Item', id: itemId },
        { type: 'Item', id: 'LIST' },
        { type: 'Task', id: taskId },
        { type: 'Task', id: `${taskId}-MATERIALS` },
      ],
    }),

    getItemLocations: builder.query<ItemLocation[], void>({
      queryFn: async () => {
        try {
          const organisationId = await getAuthenticatedOrganisationId();

          const { data, error } = await supabase
            .from('locations')
            .select('id, name, description, address, organisation_id, parent_location_id')
            .eq('organisation_id', organisationId);

          if (error) {
            return { error: mapDbError(error) };
          }

          const locations: ItemLocation[] = (data ?? []).map((loc) => ({
            id: loc.id,
            organisationId: loc.organisation_id,
            name: loc.name,
            description: loc.description,
            address: loc.address,
            parentLocationId: loc.parent_location_id,
          }));

          return { data: locations };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
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

    addLocation: builder.mutation<string, { name: string; description?: string | null; address?: string | null; parentLocationId?: string | null }>({
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
              parent_location_id: location.parentLocationId ?? null,
            })
            .select('id')
            .single();

          if (error) {
            return { error: mapPermissionError(error, 'createLocation') };
          }

          return { data: data.id };
        } catch (err: unknown) {
          return { error: { status: 'CUSTOM_ERROR', error: err instanceof Error ? err.message : 'errors:generic' } };
        }
      },
      invalidatesTags: [{ type: 'ItemLocation', id: 'LIST' }],
    }),

    updateLocation: builder.mutation<void, { id: string; name?: string; description?: string | null; address?: string | null }>({
      queryFn: async ({ id, ...changes }) => {
        const { error } = await supabase.from('locations').update(changes).eq('id', id);

        if (error) {
          return { error: mapPermissionError(error, 'updateLocation') };
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
          return { error: mapPermissionError(error, 'deleteLocation') };
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
  useGetItemUnitsQuery,
  useGetAvailableUnitLocationsQuery,
  useGetUnitLocationCountsQuery,
  useAddItemUnitsMutation,
  useUpdateItemUnitMutation,
  useDeleteItemUnitMutation,
  useReserveItemUnitsMutation,
  useReleaseItemUnitsMutation,
  useChangeTaskMaterialStatusMutation,
  useGetItemLocationsQuery,
  useAddLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} = categoryApi;
