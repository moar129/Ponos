import type { InputHTMLAttributes } from 'react'

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  /** i18n-nøgle fra numberInputError, eller null. */
  error: string | null
}
