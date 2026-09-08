// utils/dataLayer/aggregateItems.ts
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