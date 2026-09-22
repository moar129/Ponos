import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { Folder, Package, MapPin, Boxes } from 'lucide-react';
import type { GlobalSearchResultsComponentProps, ItemLocation } from '../../types/dataLayer/datalayerTypes';
import { ITEM_STATUS_STYLES } from '../../types/dataLayer/datalayerTypes';

// Udvider den eksisterende props-type lokalt, så vi ikke behøver at røre
// den delte type-fil for at tilføje lager/sektion-søgning.
type Props = GlobalSearchResultsComponentProps & {
  matchedLocations: ItemLocation[];
  allLocations: ItemLocation[];
  onSelectLocation: (location: ItemLocation) => void;
};

function locationPathLabel(location: ItemLocation, allLocations: ItemLocation[]): string {
  if (!location.parentLocationId) return location.name;
  const parent = allLocations.find((l) => l.id === location.parentLocationId);
  return parent ? `${parent.name} > ${location.name}` : location.name;
}

export function GlobalSearchResultsComponent({
  isOpen, query, matchedCategories, matchedItems, matchedLocations, allLocations,
  onSelectCategory, onSelectItem, onSelectLocation,
}: Props) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  if (!isOpen || !query.trim()) return null;

  const hasResults = matchedCategories.length > 0 || matchedItems.length > 0 || matchedLocations.length > 0;

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

          {matchedLocations.length > 0 && (
            <div className="p-2 border-t border-border-gray dark:border-slate-700">
              <p className="px-2 py-1 text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{t('search.locations')}</p>
              {matchedLocations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => onSelectLocation(loc)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-bg-gray/70 text-left justify-between dark:hover:bg-slate-700/70"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {loc.parentLocationId ? (
                      <Boxes className="w-4 h-4 text-accent shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-accent shrink-0" />
                    )}
                    <span className="text-sm text-primary truncate dark:text-slate-100">{locationPathLabel(loc, allLocations)}</span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                    loc.parentLocationId
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                  }`}>
                    {loc.parentLocationId ? t('locations.section') : t('locations.warehouse')}
                  </span>
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