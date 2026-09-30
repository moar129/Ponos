// src/components/dataLayer/warehouse/LocationKindBadge.tsx
import { useTranslation } from 'react-i18next'
import type { ItemLocation } from '../../../types/dataLayer/datalayerTypes'

// Lille "LAGER"/"SEKTION"-mærke ved en lokation.
export function LocationKindBadge({ location, className = '' }: { location: ItemLocation; className?: string }) {
  const { t } = useTranslation('datalayer')
  const isSection = Boolean(location.parentLocationId)

  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
        isSection
          ? 'bg-accent/10 text-accent border-accent/30'
          : 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
      } ${className}`}
    >
      {isSection ? t('locations.section') : t('locations.warehouse')}
    </span>
  )
}
