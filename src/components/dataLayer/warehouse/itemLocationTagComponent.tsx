import { useTranslation } from 'react-i18next';
import { Boxes, MapPin } from 'lucide-react';
import type { ItemLocationTagProps } from '../../../types/dataLayer/datalayerTypes';

// Viser hvor et item ligger: "Lager › Sektion" for sektioner, ellers lagernavn.
export function ItemLocationTag({ locationId, locationsById, className }: ItemLocationTagProps) {
  const { t } = useTranslation('datalayer');
  const location = locationId ? locationsById.get(locationId) : undefined;

  if (!location) {
    return (
      <span className={`text-xs text-secondary italic dark:text-slate-400 ${className ?? ''}`}>
        {t('itemDetail.noLocation')}
      </span>
    );
  }

  const parent = location.parentLocationId ? locationsById.get(location.parentLocationId) : undefined;
  const Icon = location.parentLocationId ? Boxes : MapPin;

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 text-xs font-medium text-accent ${className ?? ''}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">
        {parent ? `${parent.name} › ${location.name}` : location.name}
      </span>
    </span>
  );
}
