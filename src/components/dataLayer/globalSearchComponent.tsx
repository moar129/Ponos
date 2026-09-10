import type { MouseEvent } from 'react';
import { Folder, Package } from 'lucide-react';
import type { GlobalSearchResultsComponentProps } from '../../types/dataLayer/datalayerTypes';


export function GlobalSearchResultsComponent({
  isOpen, query, matchedCategories, matchedItems, onSelectCategory, onSelectItem,
}: GlobalSearchResultsComponentProps) {
  if (!isOpen || !query.trim()) return null;

  const hasResults = matchedCategories.length > 0 || matchedItems.length > 0;

  // Forhindrer at input'et mister fokus (og dermed lukker dropdown'en), før klikket når frem
  const preventBlur = (e: MouseEvent) => e.preventDefault();

  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl max-h-96 overflow-y-auto">
      {!hasResults ? (
        <p className="p-4 text-sm text-slate-400 text-center">Ingen resultater for "{query}"</p>
      ) : (
        <>
          {matchedCategories.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs text-slate-500 uppercase tracking-wide">Kategorier</p>
              {matchedCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => onSelectCategory(cat)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/70 text-left"
                >
                  <Folder className="w-4 h-4 text-[#C7975D] shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{cat.title}</span>
                </button>
              ))}
            </div>
          )}

          {matchedItems.length > 0 && (
            <div className="p-2 border-t border-slate-800">
              <p className="px-2 py-1 text-xs text-slate-500 uppercase tracking-wide">Items</p>
              {matchedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => onSelectItem(item)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-800/70 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 truncate">{item.sourceCategoryTitle}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">{item.itemStatus}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}