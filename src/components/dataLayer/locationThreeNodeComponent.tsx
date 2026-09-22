import { useTranslation } from 'react-i18next'
import type { LocationTreeNodeProps } from '../../types/dataLayer/datalayerTypes';
import { ChevronRight, ChevronDown, MapPin, Boxes, Plus, Pencil, Trash2 } from 'lucide-react';

// Samme visuelle mønster som CategoryTreeNode.tsx (indrykning, hover-
// synlige handlingsknapper, chevron for udfoldning) - genbrugt her, så
// lagre/sektioner navigeres på nøjagtig samme måde som kategorier/
// underkategorier, i stedet for den tidligere drill-down-modal.
export function LocationTreeNode({
  location,
  childSections,
  isWarehouse,
  selectedLocationId,
  onSelectLocation,
  onAddSection,
  onEditLocation,
  onDeleteLocation,
  canCreate,
  canUpdate,
  canDelete,
  isExpanded,
  onToggleExpand,
}: LocationTreeNodeProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const hasChildren = isWarehouse && childSections.length > 0;
  const isSelected = selectedLocationId === location.id;

  return (
    <div className={isWarehouse ? '' : 'ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border-gray dark:border-slate-700 my-0.5'}>
      <div
        className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors group ${
          isSelected
            ? 'bg-accent/15 text-primary font-medium dark:text-slate-100'
            : 'text-secondary hover:bg-bg-gray/60 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
        }`}
        onClick={() => onSelectLocation(location)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(location.id);
              }}
              className="p-0.5 hover:bg-border-gray rounded text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          {isWarehouse ? (
            <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-secondary group-hover:text-accent dark:text-slate-400'}`} />
          ) : (
            <Boxes className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-secondary group-hover:text-accent dark:text-slate-400'}`} />
          )}
          <span className="text-sm truncate">{location.name}</span>
        </div>

        {/* Handlingsknapper altid synlige på touch (samme regel som
            CategoryTreeNode.tsx), skjult bag hover fra lg. */}
        <div className="flex items-center shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {canUpdate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditLocation(location);
              }}
              className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors dark:hover:bg-slate-700 dark:text-slate-400"
              title={t('common:edit')}
              aria-label={t('common:edit')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {isWarehouse && canCreate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSection(location.id);
              }}
              className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors ml-0.5 dark:hover:bg-slate-700 dark:text-slate-400"
              title={t('locations.addSection')}
              aria-label={t('locations.addSection')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLocation(location);
              }}
              className="p-1.5 lg:p-1 hover:bg-red-50 rounded text-secondary hover:text-red-600 transition-colors ml-0.5 dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-red-400"
              title={t('common:delete')}
              aria-label={t('common:delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isWarehouse && isExpanded && hasChildren && (
        <div className="mt-0.5">
          {childSections.map((section) => (
            <LocationTreeNode
              key={section.id}
              location={section}
              childSections={[]}
              isWarehouse={false}
              selectedLocationId={selectedLocationId}
              onSelectLocation={onSelectLocation}
              onAddSection={onAddSection}
              onEditLocation={onEditLocation}
              onDeleteLocation={onDeleteLocation}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              isExpanded={false}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}