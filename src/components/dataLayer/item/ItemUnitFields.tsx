// src/components/dataLayer/item/ItemUnitFields.tsx
//
// Den ene "hvordan tælles dette item"-formular: art (enkeltstyk / mængde /
// beholder), serienumre, indhold pr. enhed og de automatiske
// statusskift ved tom/delvist/fuld. Bruges både når items oprettes
// (AddItemsComponent, én pr. række) og når der tilføjes enheder til et
// eksisterende item (ItemDetailComponent). Før lå den som to kopier med
// hver sine standardværdier og oversættelsesnøgler.
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import {
  PACKAGING_SUGGESTIONS_DISCRETE,
  PACKAGING_SUGGESTIONS_MEASURED,
  UNIT_OF_MEASUREMENT_SUGGESTIONS,
} from '../../../types/dataLayer/datalayerTypes'
import type { ItemKind, ItemUnitFieldsProps, ItemUnitFormValues } from '../../../types/dataLayer/datalayerTypes'
import { itemKindOf } from '../../../utils/itemUnitForm'
import { NumberInput } from '../../common/NumberInput'
import { ItemStatusSelect } from './ItemStatusSelect'

function Hint({ children }: { children: string }) {
  return (
    <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
      <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
      {children}
    </p>
  )
}

/** Forklaringen på de tre arter. */
export function ItemKindHelp({ className = '' }: { className?: string }) {
  const { t } = useTranslation('datalayer')
  return (
    <div className={`p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-secondary dark:bg-accent/10 dark:border-accent/30 dark:text-slate-400 ${className}`}>
      <p className="font-medium text-primary mb-1 dark:text-slate-100">{t('addItems.helpHeading')}</p>
      <ul className="space-y-0.5 list-disc list-inside">
        <li>{t('addItems.helpDiscrete')}</li>
        <li>{t('addItems.helpMeasured')}</li>
        <li>{t('addItems.helpContainer')}</li>
      </ul>
    </div>
  )
}

/** Forslag til enhed og emballage (datalist-id'erne bruges af felterne). */
export function ItemSuggestionLists() {
  return (
    <>
      <datalist id="unit-of-measurement-suggestions">
        {UNIT_OF_MEASUREMENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
      </datalist>
      <datalist id="packaging-suggestions-discrete">
        {PACKAGING_SUGGESTIONS_DISCRETE.map((s) => <option key={s} value={s} />)}
      </datalist>
      <datalist id="packaging-suggestions-measured">
        {PACKAGING_SUGGESTIONS_MEASURED.map((s) => <option key={s} value={s} />)}
      </datalist>
    </>
  )
}

/** Art-vælgeren (radioknapper). */
export function ItemKindRadios({ values, onKindChange }: { values: ItemUnitFormValues; onKindChange: (kind: ItemKind) => void }) {
  const { t } = useTranslation('datalayer')
  const current = itemKindOf(values)
  const options = [
    ['discrete', t('addItems.discreteOption')],
    ['measured', t('addItems.measuredOption')],
    ['container', t('addItems.containerOption')],
  ] as const

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {options.map(([kind, label]) => (
        <label key={kind} className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
          <input type="radio" checked={current === kind} onChange={() => onKindChange(kind)} />
          {label}
        </label>
      ))}
    </div>
  )
}

/**
 * Serienumre, "har indhold", indhold/startniveau og tærsklerne - alt det
 * der afhænger af arten. Antal og status lægger kalderen selv, da de står
 * forskelligt i de to formularer.
 */
export function ItemUnitFields({ values, onChange, errorFor, inputClass, selectClass }: ItemUnitFieldsProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const { isDiscrete, hasContents } = values

  return (
    <>
      {isDiscrete && (
        <label className="sm:col-span-2 text-xs text-secondary dark:text-slate-400">
          {t('addItems.serialNumbersPlaceholder')}
          <input
            type="text"
            value={values.serialNumbersRaw}
            onChange={(e) => onChange({ serialNumbersRaw: e.target.value })}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      )}
      {isDiscrete && (
        <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer dark:text-slate-100">
          <input type="checkbox" checked={hasContents} onChange={(e) => onChange({ hasContents: e.target.checked })} />
          {t('addItems.hasContentsOption')}
        </label>
      )}
      {hasContents && (
        <div>
          <label className="text-xs text-secondary dark:text-slate-400">
            {t(isDiscrete ? 'addItems.contentsTotalPlaceholder' : 'addItems.contentsTotalPlaceholderMeasured')}
            <NumberInput
              value={values.contentsTotal}
              onValueChange={(contentsTotal) => onChange({ contentsTotal })}
              error={errorFor('contentsTotal')}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          {isDiscrete && <Hint>{t('addItems.hasContentsHint')}</Hint>}
        </div>
      )}
      {!isDiscrete && hasContents && (
        <div>
          <label className="text-xs text-secondary dark:text-slate-400">
            {t('addItems.contentsStartPlaceholder')}
            <NumberInput
              value={values.contentsStart}
              onValueChange={(contentsStart) => onChange({ contentsStart })}
              error={errorFor('contentsStart')}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <Hint>{t('addItems.containerLevelHint')}</Hint>
        </div>
      )}
      {hasContents && (
        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <p className="sm:col-span-3 text-[11px] text-secondary uppercase tracking-wide dark:text-slate-400">
            {t('addItems.contentsStatusHeading')}
          </p>
          <div className="sm:col-span-3 -mt-1">
            <Hint>{t('addItems.contentsStatusHint')}</Hint>
          </div>
          {([
            ['contentsEmptyStatus', t('addItems.contentsEmptyStatusLabel')],
            ['contentsPartialStatus', t('addItems.contentsPartialStatusLabel')],
            ['contentsFullStatus', t('addItems.contentsFullStatusLabel')],
          ] as const).map(([field, label]) => (
            <label key={field} className="text-xs text-secondary dark:text-slate-400">
              {label}
              <ItemStatusSelect
                value={values[field]}
                onChange={(status) => onChange({ [field]: status })}
                emptyLabel={t('addItems.contentsStatusNoChange')}
                className={`mt-1 ${selectClass}`}
              />
            </label>
          ))}
        </div>
      )}
    </>
  )
}
