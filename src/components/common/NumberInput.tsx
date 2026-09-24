import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import type { NumberInputProps } from '../../types/common/numberInputType'

// Almindeligt tekstfelt til tal - ingen op/ned-pile (type="number"), og
// feltet kan være tomt mens man skriver. Fejlen (fra numberInputError i
// utils/numberInput.ts) vises med rød kant og tekst under feltet.
export function NumberInput({ value, onValueChange, error, className = '', ...rest }: NumberInputProps) {
  const { t } = useTranslation()
  const td = asDynamic(t)

  return (
    <>
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={error !== null}
        className={`${className} ${error ? 'border-red-500! dark:border-red-500!' : ''}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{td(error)}</span>}
    </>
  )
}
