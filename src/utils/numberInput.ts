// Talfelter holdes som tekst (string), så et felt kan være tomt, mens man
// skriver - Number('') ville ellers straks blive 0. Komma og punktum
// accepteres begge som decimaltegn.

/** Tallet i feltet, eller null hvis feltet er tomt/ugyldigt. */
export function parseNumberInput(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export interface NumberInputRules {
  /** 0 er gyldigt (fx niveau på en tom beholder). Default false. */
  allowZero?: boolean
  /** Tomt felt er en fejl. Default true. */
  required?: boolean
}

/** i18n-nøgle for feltets fejl, eller null hvis værdien er gyldig. */
export function numberInputError(value: string, { allowZero = false, required = true }: NumberInputRules = {}): string | null {
  if (value.trim() === '') return required ? 'common:numberInput.required' : null
  const parsed = parseNumberInput(value)
  if (parsed === null) return 'common:numberInput.invalid'
  if (parsed < 0) return 'common:numberInput.negative'
  if (parsed === 0 && !allowZero) return 'common:numberInput.zero'
  return null
}

/** Et tal som tekst til et talfelt ('' for null/undefined). */
export function toNumberInput(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}
