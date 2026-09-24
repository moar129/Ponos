import { X, MapPin, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next'
import type { ItemLocation, LocationItemsComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { formatItemQuantity } from '../../../types/dataLayer/datalayerTypes';
import { ItemStatusBadges } from '../itemStatusBadgesComponent';

// Samme sti-opbygning som itemsDetailComponent.tsx bruger - viser
// "Lager > Sektion" i stedet for kun sektionens eget navn, så det er
// tydeligt hvilket lager man er inde under.
function locationPathLabel(location: ItemLocation, allLocations: ItemLocation[]): string {
  if (!location.parentLocationId) return location.name;
  const parent = allLocations.find((l) => l.id === location.parentLocationId);
  return parent ? `${parent.name} > ${location.name}` : location.name;
}

export function LocationItemsComponent({ isOpen, location, items, onClose, onSelectItem, allLocations }: LocationItemsComponentProps & { allLocations: ItemLocation[] }) {
  const { t } = useTranslation(['datalayer', 'common'])
  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-accent shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                  location.parentLocationId
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
                }`}>
                  {location.parentLocationId ? t('locations.section') : t('locations.warehouse')}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-primary truncate dark:text-slate-100">
                {locationPathLabel(location, allLocations)}
              </h2>
              {location.address && <p className="text-xs text-secondary truncate dark:text-slate-400">{location.address}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100" title={t('close')} aria-label={t('closeModal')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-secondary dark:text-slate-400">
              <Package className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
              <p className="text-sm">{t('locations.noItemsHere')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border-gray border border-border-gray rounded-lg overflow-hidden dark:divide-slate-700 dark:border-slate-700">
              {items.map((item) => (
               <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 bg-white hover:bg-bg-gray/40 text-left transition-colors dark:bg-slate-800 dark:hover:bg-slate-700/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary truncate dark:text-slate-100">{item.name}</p>
                    <p className="text-xs text-secondary truncate dark:text-slate-400">{item.sourceCategoryTitle}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-sm text-secondary dark:text-slate-400">
                    <span>{formatItemQuantity(item)}</span>
                    <ItemStatusBadges item={item} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}