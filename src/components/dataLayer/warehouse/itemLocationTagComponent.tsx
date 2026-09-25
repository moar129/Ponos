import { useTranslation } from 'react-i18next';
import { Boxes, MapPin } from 'lucide-react';
import type { ItemLocation, ItemLocationTagProps } from '../../../types/dataLayer/datalayerTypes';

function locationLabel(location: ItemLocation, locationsById: Map<string, ItemLocation>): string {
  const parent = location.parentLocationId ? locationsById.get(location.parentLocationId) : undefined;
  return parent ? `${parent.name} › ${location.name}` : location.name;
}

// Viser hvor et item ligger: "Lager › Sektion" for sektioner, ellers lagernavn.
// Ligger det flere steder, vises første + "+N", og alle i tooltip.
export function ItemLocationTag({ locationIds, locationsById, className }: ItemLocationTagProps) {
  const { t } = useTranslation('datalayer');
  const labels = locationIds.map((id) => {
    const location = id ? locationsById.get(id) : undefined;
    return location ? locationLabel(location, locationsById) : t('itemDetail.noLocation');
  });
  const first = locationIds[0] ? locationsById.get(locationIds[0]) : undefined;

  if (!first) {
    return (
      <span title={labels.join('\n')} className={`inline-flex items-center gap-1 min-w-0 text-xs text-secondary italic dark:text-slate-400 ${className ?? ''}`}>
        <span className="truncate">{t('itemDetail.noLocation')}</span>
        {labels.length > 1 && <span className="shrink-0 not-italic">{t('page.morePlacements', { count: labels.length - 1 })}</span>}
      </span>
    );
  }

  const Icon = first.parentLocationId ? Boxes : MapPin;

  return (
    <span title={labels.join('\n')} className={`inline-flex items-center gap-1 min-w-0 text-xs font-medium text-accent ${className ?? ''}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{labels[0]}</span>
      {labels.length > 1 && <span className="shrink-0">{t('page.morePlacements', { count: labels.length - 1 })}</span>}
    </span>
  );
}
