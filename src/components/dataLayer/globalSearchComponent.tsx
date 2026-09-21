import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { Folder, Package } from 'lucide-react';
import type { GlobalSearchResultsComponentProps } from '../../types/dataLayer/datalayerTypes';
import { ITEM_STATUS_STYLES } from '../../types/dataLayer/datalayerTypes';


export function GlobalSearchResultsComponent({
  isOpen, query, matchedCategories, matchedItems, onSelectCategory, onSelectItem,
}: GlobalSearchResultsComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  if (!isOpen || !query.trim()) return null;

  const hasResults = matchedCategories.length > 0 || matchedItems.length > 0;

  // Forhindrer at input'et mister fokus (og dermed lukker dropdown'en), før klikket når frem
  const preventBlur = (e: MouseEvent) => e.preventDefault();

  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-border-gray rounded-xl shadow-xl max-h-96 overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
      {!hasResults ? (
        <p className="p-4 text-sm text-secondary text-center dark:text-slate-400">{t('search.noResults', { query })}</p>
      ) : (
        <>
          {matchedCategories.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{t('search.categories')}</p>
              {matchedCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => onSelectCategory(cat)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bg-gray/70 text-left dark:hover:bg-slate-700/70"
                >
                  <Folder className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm text-primary truncate dark:text-slate-100">{cat.title}</span>
                </button>
              ))}
            </div>
          )}

          {matchedItems.length > 0 && (
            <div className="p-2 border-t border-border-gray dark:border-slate-700">
              <p className="px-2 py-1 text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{t('search.items')}</p>
              {matchedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => onSelectItem(item)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-bg-gray/70 text-left dark:hover:bg-slate-700/70"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-secondary shrink-0 dark:text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-sm text-primary truncate dark:text-slate-100">{item.name}</p>
                      <p className="text-xs text-secondary truncate dark:text-slate-400">{item.sourceCategoryTitle}</p>
                    </div>
                  </div>
                  <span className={`text-sm px-2 py-0.5 rounded border shrink-0 ${ITEM_STATUS_STYLES[item.itemStatus]}`}>{td(`datalayer:status.${item.itemStatus}`)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}