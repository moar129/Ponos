// src/utils/itemUnitForm.ts
// Logikken bag ItemUnitFields (components/dataLayer/item) - standardværdier,
// art-skift, validering og omsætning til API-argumenter.
import type { ItemKind, ItemUnitFormValues } from '../types/dataLayer/datalayerTypes'
import { numberInputError, parseNumberInput } from './numberInput'

export const emptyItemUnitForm = (): ItemUnitFormValues => ({
  quantity: '1',
  itemStatus: 'Available',
  isDiscrete: true,
  serialNumbersRaw: '',
  hasContents: false,
  contentsTotal: '1',
  contentsStart: '',
  contentsEmptyStatus: 'Consumed',
  contentsPartialStatus: 'Missing',
  contentsFullStatus: 'Available',
  packageSize: '',
})

export function itemKindOf(values: Pick<ItemUnitFormValues, 'isDiscrete' | 'hasContents'>): ItemKind {
  if (values.isDiscrete) return 'discrete'
  return values.hasContents ? 'container' : 'measured'
}

// Felterne der skifter med arten. Tærsklerne er art-afhængige: en beholder
// (fx en tank) skal ikke arve 12-pack'ens "tom = Brugt op".
export function itemKindPatch(kind: ItemKind): Partial<ItemUnitFormValues> {
  switch (kind) {
    case 'discrete':
      return { isDiscrete: true, hasContents: false, contentsEmptyStatus: 'Consumed', contentsPartialStatus: 'Missing', contentsFullStatus: 'Available' }
    case 'measured':
      return { isDiscrete: false, hasContents: false }
    case 'container':
      return { isDiscrete: false, hasContents: true, contentsEmptyStatus: 'NeedsRefilling', contentsPartialStatus: '', contentsFullStatus: 'Available' }
  }
}

// Fejl (i18n-nøgler) for de talfelter der er relevante for formens art.
// Startniveau må gerne være 0 (tom beholder).
export function itemUnitNumberErrors(values: ItemUnitFormValues) {
  return {
    quantity: numberInputError(values.quantity),
    packageSize: !values.isDiscrete && !values.hasContents ? numberInputError(values.packageSize, { required: false }) : null,
    contentsTotal: values.hasContents ? numberInputError(values.contentsTotal) : null,
    contentsStart: !values.isDiscrete && values.hasContents ? numberInputError(values.contentsStart, { required: false, allowZero: true }) : null,
  }
}

export function hasItemUnitNumberErrors(values: ItemUnitFormValues): boolean {
  return Object.values(itemUnitNumberErrors(values)).some((error) => error !== null)
}

/** Formens værdier som argumenter til addItem(s)/addItemUnits. packageSize = item'ets pakke-faktor. */
export function toItemUnitPayload(values: ItemUnitFormValues, packageSize: number | null | undefined) {
  const { isDiscrete, hasContents } = values
  return {
    quantity: parseNumberInput(values.quantity)!,
    isDiscrete,
    contentsTotal: hasContents ? parseNumberInput(values.contentsTotal)! : undefined,
    contentsStart: !isDiscrete && hasContents ? parseNumberInput(values.contentsStart) ?? undefined : undefined,
    contentsEmptyStatus: hasContents ? values.contentsEmptyStatus || null : undefined,
    contentsPartialStatus: hasContents ? values.contentsPartialStatus || null : undefined,
    contentsFullStatus: hasContents ? values.contentsFullStatus || null : undefined,
    packageSize: !isDiscrete && !hasContents ? packageSize ?? undefined : undefined,
    serialNumbers: isDiscrete && values.serialNumbersRaw.trim() ? values.serialNumbersRaw.split(',').map((s) => s.trim()) : undefined,
  }
}

/** Etiketten på antal-feltet - hvad tælles der? */
export function quantityLabelKey(values: ItemUnitFormValues, hasPackageSize: boolean) {
  if (values.isDiscrete) return 'addItems.quantityPlaceholder' as const
  if (values.hasContents) return 'addItems.containerCountPlaceholder' as const
  return hasPackageSize ? 'addItems.packageCountLabel' as const : 'addItems.measuredQuantityPlaceholder' as const
}
