// src/components/dataLayer/warehouse/LocationFormFields.tsx
import { useTranslation } from 'react-i18next'
import type { LocationFormFieldsProps, LocationFormValues } from '../../../types/dataLayer/datalayerTypes'

const INPUT =
  'w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'

// Navn, adresse og beskrivelse på et lager/en sektion - i opret/rediger-
// modalen og i lokationsvælgerens "opret og vælg".
export function LocationFormFields({ values, onChange, isSection }: LocationFormFieldsProps) {
  const { t } = useTranslation('datalayer')
  const set = (patch: Partial<LocationFormValues>) => onChange({ ...values, ...patch })

  return (
    <>
      <input
        type="text"
        autoFocus
        placeholder={isSection ? t('locations.sectionNamePlaceholder') : t('locations.namePlaceholder')}
        value={values.name}
        onChange={(e) => set({ name: e.target.value })}
        className={INPUT}
      />
      <input
        type="text"
        placeholder={t('locations.addressOptional')}
        value={values.address}
        onChange={(e) => set({ address: e.target.value })}
        className={INPUT}
      />
      <input
        type="text"
        placeholder={t('locations.descriptionOptional')}
        value={values.description}
        onChange={(e) => set({ description: e.target.value })}
        className={INPUT}
      />
    </>
  )
}
