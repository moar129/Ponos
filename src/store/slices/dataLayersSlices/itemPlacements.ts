import type {
  AggregatedItem,
  DataLayerItem,
  ItemPlacement,
  ItemStatus,
  UnitLocationCount,
} from '../../../types/dataLayer/datalayerTypes';

// Placering er pr. enhed, ikke pr. item - et item kan derfor ligge flere
// steder. Et item uden enheder falder tilbage til sin egen location_id,
// så det stadig kan findes på sit lager.
export function buildPlacementIndex(
  counts: UnitLocationCount[],
  items: DataLayerItem[]
): Map<string, ItemPlacement[]> {
  const byItem = new Map<string, Map<string | null, ItemPlacement>>();
  for (const row of counts) {
    const placements = byItem.get(row.itemId) ?? new Map<string | null, ItemPlacement>();
    const placement = placements.get(row.locationId) ?? { locationId: row.locationId, quantity: 0, statusCounts: {} };
    placement.quantity += row.quantity;
    placement.statusCounts[row.status] = (placement.statusCounts[row.status] ?? 0) + row.quantity;
    placements.set(row.locationId, placement);
    byItem.set(row.itemId, placements);
  }

  const index = new Map<string, ItemPlacement[]>();
  for (const item of items) {
    const placements = byItem.get(item.id);
    index.set(
      item.id,
      placements
        ? [...placements.values()]
        : [{ locationId: item.itemLocationId ?? null, quantity: 0, statusCounts: {} }]
    );
  }
  return index;
}

export function getPlacements(index: Map<string, ItemPlacement[]>, itemId: string): ItemPlacement[] {
  return index.get(itemId) ?? [];
}

// Item'et med antal/status kun for de givne lokationer, eller null hvis
// intet af det ligger der.
export function scopeItemToLocations(
  item: AggregatedItem,
  placements: ItemPlacement[],
  locationIds: Set<string>
): AggregatedItem | null {
  const inScope = placements.filter((p) => p.locationId !== null && locationIds.has(p.locationId));
  if (inScope.length === 0) return null;

  const statusCounts: Partial<Record<ItemStatus, number>> = {};
  let quantity = 0;
  for (const p of inScope) {
    quantity += p.quantity;
    for (const [status, n] of Object.entries(p.statusCounts) as [ItemStatus, number][]) {
      statusCounts[status] = (statusCounts[status] ?? 0) + n;
    }
  }
  return { ...item, quantity, statusCounts };
}

export interface CategorySummary {
  categoryId: string;
  path: string;
  itemCount: number;
}

export function summarizeByCategory(items: AggregatedItem[]): CategorySummary[] {
  const byId = new Map<string, CategorySummary>();
  for (const item of items) {
    const existing = byId.get(item.categoryId);
    if (existing) existing.itemCount += 1;
    else byId.set(item.categoryId, { categoryId: item.categoryId, path: item.sourceCategoryTitle, itemCount: 1 });
  }
  return [...byId.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export interface LocationSummary {
  locationId: string | null;
  itemCount: number;
}

// Antal items (ikke mængde - stk/kg/liter kan ikke lægges sammen) pr. lokation.
export function summarizeByLocation(
  items: AggregatedItem[],
  index: Map<string, ItemPlacement[]>
): LocationSummary[] {
  const byId = new Map<string | null, LocationSummary>();
  for (const item of items) {
    for (const p of getPlacements(index, item.id)) {
      const existing = byId.get(p.locationId);
      if (existing) existing.itemCount += 1;
      else byId.set(p.locationId, { locationId: p.locationId, itemCount: 1 });
    }
  }
  return [...byId.values()];
}
