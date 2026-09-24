import type { ItemLocation } from '../types/dataLayer/datalayerTypes';

// "Lager > Sektion" for a section, otherwise just the warehouse name.
export function locationPathLabel(location: ItemLocation, allLocations: ItemLocation[]): string {
  if (!location.parentLocationId) return location.name;
  const parent = allLocations.find((l) => l.id === location.parentLocationId);
  return parent ? `${parent.name} > ${location.name}` : location.name;
}
