import { useTranslation } from 'react-i18next';
import { asDynamic } from '../../i18n/config';
import { ITEM_STATUS_STYLES } from '../../types/dataLayer/datalayerTypes';
import type { DataLayerItem, ItemStatus } from '../../types/dataLayer/datalayerTypes';

// US-42: et item kan nu have flere statusser samtidig (fx 10 Available +
// 3 Reserved), så et enkelt statusbadge er ikke længere nok - denne
// komponent samler visningen ét sted, brugt i alle liste-/søgevisninger.
export function ItemStatusBadges({ item, className }: { item: DataLayerItem; className?: string }) {
  const { t } = useTranslation('datalayer');
  const td = asDynamic(t);
  const entries = (Object.entries(item.statusCounts) as [ItemStatus, number][]).filter(([, count]) => (count ?? 0) > 0);

  if (entries.length === 0) {
    return (
      <span className={`px-2 py-0.5 rounded border text-xs bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700 ${className ?? ''}`}>
        {td('datalayer:itemDetail.noUnits')}
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap gap-1 justify-end ${className ?? ''}`}>
      {entries.map(([status, count]) => (
        <span key={status} className={`px-2 py-0.5 rounded border text-xs ${ITEM_STATUS_STYLES[status]}`}>
          {td(`datalayer:status.${status}`)}: {count}
        </span>
      ))}
    </span>
  );
}
