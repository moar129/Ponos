import { useTranslation } from 'react-i18next'
import type { LocationTreeNodeProps } from '../../../types/dataLayer/datalayerTypes';
import { MapPin, Boxes, Plus, Pencil, Trash2 } from 'lucide-react';
import { TreeActionButton, TreeRow } from '../TreeRow';

// Samme række som kategori-træet (TreeRow), så lagre/sektioner navigeres
// på nøjagtig samme måde som kategorier/underkategorier.
export function LocationTreeNode(props: LocationTreeNodeProps) {
  const {
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
    favoriteIds,
    canFavorite,
    onToggleFavorite,
  } = props;
  const { t } = useTranslation(['datalayer', 'common'])
  const hasChildren = isWarehouse && childSections.length > 0;

  return (
    <div className={isWarehouse ? '' : 'ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border-gray dark:border-slate-700 my-0.5'}>
      <TreeRow
        label={location.name}
        icon={isWarehouse ? MapPin : Boxes}
        isSelected={selectedLocationId === location.id}
        onSelect={() => onSelectLocation(location)}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggleExpand={() => onToggleExpand(location.id)}
        // Lager-rækker har 2 knapper færre (ingen op/ned) - så rækken
        // ombrydes ved samme panelbredde som kategori-rækker.
        nameMinWidthClass="min-w-[10.5rem]"
        favorite={canFavorite ? { isFavorite: favoriteIds.has(location.id), onToggle: () => onToggleFavorite(location.id) } : undefined}
        actions={
          <>
            {canUpdate && <TreeActionButton icon={Pencil} label={t('common:edit')} onClick={() => onEditLocation(location)} />}
            {isWarehouse && canCreate && (
              <TreeActionButton icon={Plus} label={t('locations.addSection')} onClick={() => onAddSection(location.id)} />
            )}
            {canDelete && <TreeActionButton icon={Trash2} label={t('common:delete')} onClick={() => onDeleteLocation(location)} danger />}
          </>
        }
      />

      {isWarehouse && isExpanded && hasChildren && (
        <div className="mt-0.5">
          {childSections.map((section) => (
            <LocationTreeNode
              {...props}
              key={section.id}
              location={section}
              childSections={[]}
              isWarehouse={false}
              isExpanded={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
