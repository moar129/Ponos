// src/components/dataLayer/item/ItemStatusSelect.tsx
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { ALL_ITEM_STATUSES, type ItemStatus, type ItemStatusSelectProps } from '../../../types/dataLayer/datalayerTypes'

// Dropdown med alle enhedsstatusser. Afløser 11 håndskrevne
// ALL_ITEM_STATUSES.map(<option>)-lister i datalager og opgave-materialer.
export function ItemStatusSelect({
  value,
  onChange,
  className,
  emptyLabel,
  placeholder,
  statuses = ALL_ITEM_STATUSES,
  disabled,
  id,
  'aria-label': ariaLabel,
}: ItemStatusSelectProps) {
  const { t } = useTranslation('datalayer')
  const td = asDynamic(t)

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as ItemStatus | '')}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
      {statuses.map((status) => (
        <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>
      ))}
    </select>
  )
}
