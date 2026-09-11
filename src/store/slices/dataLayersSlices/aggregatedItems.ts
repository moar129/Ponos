import type { DataLayerCat, AggregatedItem } from '../../../types/dataLayer/datalayerTypes';


export function getAggregatedItems(category: DataLayerCat): AggregatedItem[] {
  const result: AggregatedItem[] = [];

  function walk(cat: DataLayerCat, isRoot: boolean) {
    for (const item of cat.items) {
      result.push({
        ...item,
        sourceCategoryTitle: cat.title,
        isFromSubCategory: !isRoot,
      });
    }
    for (const sub of cat.subCategories) {
      walk(sub, false);
    }
  }

  walk(category, true);
  return result;
}

export function flattenAllItems(categoryTree: DataLayerCat[]): AggregatedItem[] {
  const result: AggregatedItem[] = [];

  function walk(cat: DataLayerCat) {
    for (const item of cat.items) {
      result.push({ ...item, sourceCategoryTitle: cat.title, isFromSubCategory: false });
    }
    for (const sub of cat.subCategories) walk(sub);
  }

  for (const root of categoryTree) walk(root);
  return result;
}

export function getDescendantCategories(category: DataLayerCat): DataLayerCat[] {
  const result: DataLayerCat[] = [category];
  for (const sub of category.subCategories) {
    result.push(...getDescendantCategories(sub));
  }
  return result;
}

export function searchCategories(categories: DataLayerCat[], query: string): DataLayerCat[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const result: DataLayerCat[] = [];

  function walk(cat: DataLayerCat) {
    if (cat.title.toLowerCase().includes(q)) result.push(cat);
    for (const sub of cat.subCategories) walk(sub);
  }

  for (const root of categories) walk(root);
  return result;
}

export function searchItemsGlobal(categories: DataLayerCat[], query: string): AggregatedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return flattenAllItems(categories).filter(
    (item) => item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q)
  );
}