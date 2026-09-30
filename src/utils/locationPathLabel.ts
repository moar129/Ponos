import type { ItemLocation } from '../types/dataLayer/datalayerTypes';

// Skilletegnet i alle viste stier - kategorier ("Møbler › Stole") og
// lokationer ("Lager › Sektion"). Før brugte nogle steder '>' og andre '›'
// for den samme sti.
export const PATH_SEPARATOR = ' › ';

export function joinPath(parts: string[]): string {
  return parts.join(PATH_SEPARATOR);
}

// "Lager › Sektion" for a section, otherwise just the warehouse name.
export function locationPathLabel(
  location: ItemLocation,
  locations: readonly ItemLocation[] | ReadonlyMap<string, ItemLocation>,
): string {
  if (!location.parentLocationId) return location.name;
  const parent = 'get' in locations
    ? locations.get(location.parentLocationId)
    : locations.find((l) => l.id === location.parentLocationId);
  return parent ? joinPath([parent.name, location.name]) : location.name;
}
