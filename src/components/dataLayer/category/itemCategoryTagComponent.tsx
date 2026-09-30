import { Tag } from 'lucide-react';
import type { ItemCategoryTagProps } from '../../../types/dataLayer/datalayerTypes';

// Viser et items kategori-sti ("Møbler › Stole"), som aggregatedItems
// allerede har bygget (sourceCategoryTitle).
export function ItemCategoryTag({ categoryPath, className }: ItemCategoryTagProps) {
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 text-xs font-medium text-secondary dark:text-slate-300 ${className ?? ''}`}>
      <Tag className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{categoryPath}</span>
    </span>
  );
}
