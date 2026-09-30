import type { DataLayerCat, AggregatedItem } from '../../../types/dataLayer/datalayerTypes';
import { joinPath } from '../../../utils/locationPathLabel';

// Hjælpere til kategori-træet (bygget af categoryApi.buildCategoryTree).

export function getAggregatedItems(category: DataLayerCat, ancestorTitles: string[] = []): AggregatedItem[] {
  const result: AggregatedItem[] = [];

  function walk(cat: DataLayerCat, path: string[], isRoot: boolean) {
    const currentPath = [...path, cat.title];
    for (const item of cat.items) {
      result.push({
        ...item,
        sourceCategoryTitle: joinPath(currentPath),
        isFromSubCategory: !isRoot,
      });
    }
    for (const sub of cat.subCategories) {
      walk(sub, currentPath, false);
    }
  }

  walk(category, ancestorTitles, true);
  return result;
}

export function flattenAllItems(categoryTree: DataLayerCat[]): AggregatedItem[] {
  return categoryTree
    .flatMap((root) => getAggregatedItems(root))
    .map((item) => ({ ...item, isFromSubCategory: false }));
}

export function getDescendantCategories(category: DataLayerCat): DataLayerCat[] {
  return [category, ...category.subCategories.flatMap(getDescendantCategories)];
}

export function findCategoryInTree(categories: DataLayerCat[], id: string): DataLayerCat | null {
  return getCategoryPath(categories, id)?.at(-1) ?? null;
}

/** Kategorien og alle dens forfædre, rod først - eller null. */
export function getCategoryPath(categories: DataLayerCat[], id: string): DataLayerCat[] | null {
  for (const cat of categories) {
    if (cat.id === id) return [cat];
    const found = getCategoryPath(cat.subCategories, id);
    if (found) return [cat, ...found];
  }
  return null;
}

/** Listen kategorien ligger i (dens søskende inkl. sig selv) - eller null. */
export function findSiblings(categories: DataLayerCat[], id: string): DataLayerCat[] | null {
  if (categories.some((cat) => cat.id === id)) return categories;
  for (const cat of categories) {
    const found = findSiblings(cat.subCategories, id);
    if (found) return found;
  }
  return null;
}

/**
 * Træet fladt ud til "Forælder › Kategori"-etiketter, så man kan se hvor
 * i hierarkiet man vælger uden at åbne træet. Til kategori-dropdowns.
 */
export function flattenWithPath(categories: DataLayerCat[], path: string[] = []): { id: string; label: string }[] {
  return categories.flatMap((cat) => {
    const currentPath = [...path, cat.title];
    return [{ id: cat.id, label: joinPath(currentPath) }, ...flattenWithPath(cat.subCategories, currentPath)];
  });
}

export function searchCategories(categories: DataLayerCat[], query: string): DataLayerCat[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return categories.flatMap(getDescendantCategories).filter((cat) => cat.title.toLowerCase().includes(q));
}

export function searchItemsGlobal(categories: DataLayerCat[], query: string): AggregatedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return flattenAllItems(categories).filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q) ||
      (item.packaging ?? '').toLowerCase().includes(q)
  );
}
