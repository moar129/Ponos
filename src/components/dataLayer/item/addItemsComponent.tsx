import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Loader2, Folder, ChevronDown, Info } from 'lucide-react';
import { useAddItemsMutation } from '../../../store/apis/categoryApi';
import type { AddItemsComponentProps, ItemRow } from '../../../types/dataLayer/datalayerTypes';
import { NumberInput } from '../../common/NumberInput';
import { parseNumberInput } from '../../../utils/numberInput';
import { getErrorMessage } from '../../../ErrorMessage';
import { LocationPickerComponent } from '../warehouse/locationsPickerComponent';
import { flattenWithPath } from '../../../store/slices/dataLayersSlices/aggregatedItems';
import { Alert } from '../../common/Alert';
import { Modal } from '../../common/Modal';
import { ItemStatusSelect } from './ItemStatusSelect';
import { ItemKindHelp, ItemKindRadios, ItemSuggestionLists, ItemUnitFields } from './ItemUnitFields';
import {
  emptyItemUnitForm,
  hasItemUnitNumberErrors,
  itemKindPatch,
  itemUnitNumberErrors,
  quantityLabelKey,
  toItemUnitPayload,
} from '../../../utils/itemUnitForm';

const INPUT = 'w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';
const SELECT = 'w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';

function emptyRow(): ItemRow {
  return {
    ...emptyItemUnitForm(),
    key: crypto.randomUUID(),
    name: '',
    description: '',
    packaging: '',
    unitOfMeasurement: 'stk',
  };
}

// Kalderen mounter kun modalen mens den er åben, så den altid starter med
// én tom række og den kategori brugeren står i.
export function AddItemsComponent({
  onClose, categoryTree, categoryId, categoryTitle, onSuccess, canCreate,
}: AddItemsComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryId);
  const [formError, setFormError] = useState<string | null>(null);
  // Efter et forsøg på at oprette vises også "Skriv et tal." for tomme
  // påkrævede felter - før det kun fejl for felter man har skrevet i.
  const [submitted, setSubmitted] = useState(false);
  const [addItems, { isLoading }] = useAddItemsMutation();

  const categoryOptions = flattenWithPath(categoryTree);

  const updateRow = (key: string, patch: Partial<ItemRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Fejl vises for felter man har skrevet i, og - efter et forsøg på at
  // oprette - også for tomme påkrævede felter i rækker med navn.
  const visibleError = (row: ItemRow, field: keyof ReturnType<typeof itemUnitNumberErrors>) =>
    row[field].trim() !== '' || (submitted && row.name.trim() !== '') ? itemUnitNumberErrors(row)[field] : null;

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (key: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const handleSubmit = async () => {
    if (!selectedCategoryId) return setFormError(t('addItems.noCategory'));

    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) return setFormError(t('addItems.atLeastOne'));

    setSubmitted(true);
    if (validRows.some(hasItemUnitNumberErrors)) {
      return setFormError(t('common:numberInput.fixFields'));
    }

    try {
      await addItems(
        validRows.map((r) => ({
          ...toItemUnitPayload(r, parseNumberInput(r.packageSize)),
          categoryId: selectedCategoryId,
          itemLocationId: locationId,
          name: r.name.trim(),
          description: r.description.trim() || null,
          packaging: r.packaging.trim() || null,
          unitOfMeasurement: r.unitOfMeasurement.trim() || 'stk',
          itemStatus: r.itemStatus,
        }))
      ).unwrap();

      onSuccess?.();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, t('addItems.createFailed')));
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={t('addItems.heading')}
      subtitle={categoryTitle && t('addItems.suggestedCategory', { name: categoryTitle })}
      size="3xl"
      closeOnBackdrop={false}
      disableClose={isLoading}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium disabled:opacity-60"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('addItems.submit')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert>{formError}</Alert>

        <ItemKindHelp />

        <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg dark:bg-slate-800/40 dark:border-slate-700">
          <label htmlFor="add-items-category" className="block text-xs text-secondary uppercase tracking-wide mb-1.5 dark:text-slate-400">{t('fields.category')}</label>
          <div className="relative">
            <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
            <select
              id="add-items-category"
              value={selectedCategoryId ?? ''}
              onChange={(e) => setSelectedCategoryId(e.target.value || null)}
              className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-8 py-2 text-sm text-primary focus:outline-none focus:border-accent appearance-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            >
              <option value="" disabled>{t('addItems.chooseCategoryOption')}</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
          </div>
          <p className="text-[11px] text-secondary mt-1.5 dark:text-slate-400">{t('addItems.categoryNote')}</p>
        </div>

        <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg dark:bg-slate-800/40 dark:border-slate-700">
          <LocationPickerComponent value={locationId} onChange={setLocationId} canCreate={canCreate} />
          <p className="text-[11px] text-secondary mt-1.5 dark:text-slate-400">{t('addItems.locationNote')}</p>
        </div>

        {rows.map((row, idx) => (
          <div key={row.key} className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg space-y-2 dark:bg-slate-800/40 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{t('addItems.itemNumber', { number: idx + 1 })}</span>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length === 1}
                className="p-1 rounded text-secondary hover:text-red-600 hover:bg-red-50 disabled:opacity-30 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                title={t('addItems.removeItem')}
                aria-label={t('addItems.removeItem')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <ItemKindRadios
              values={row}
              onKindChange={(kind) =>
                updateRow(row.key, {
                  ...itemKindPatch(kind),
                  // "stk" er kun et fornuftigt udgangspunkt for enkeltstyk -
                  // et efterladt "stk" ved skift til Mængde ville skjule
                  // pladsholder-hintet ("fx kg, liter").
                  ...(kind === 'discrete'
                    ? row.unitOfMeasurement === '' ? { unitOfMeasurement: 'stk' } : {}
                    : row.unitOfMeasurement === 'stk' ? { unitOfMeasurement: '' } : {}),
                })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-xs text-secondary dark:text-slate-400">
                {t('addItems.namePlaceholder')}
                <input type="text" value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} className={`mt-1 ${INPUT}`} />
              </label>
              <label className="text-xs text-secondary dark:text-slate-400">
                {t(quantityLabelKey(row, row.packageSize.trim() !== ''))}
                <NumberInput
                  value={row.quantity}
                  onValueChange={(quantity) => updateRow(row.key, { quantity })}
                  error={visibleError(row, 'quantity')}
                  className={`mt-1 ${INPUT}`}
                />
              </label>
              <label className="sm:col-span-2 text-xs text-secondary dark:text-slate-400">
                {t('addItems.descriptionPlaceholder')}
                <input type="text" value={row.description} onChange={(e) => updateRow(row.key, { description: e.target.value })} className={`mt-1 ${INPUT}`} />
              </label>
              <label className="text-xs text-secondary dark:text-slate-400">
                {t('fields.packaging')}
                <input
                  type="text"
                  list={row.isDiscrete ? 'packaging-suggestions-discrete' : 'packaging-suggestions-measured'}
                  placeholder={t(row.isDiscrete ? 'addItems.packagingPlaceholder' : 'addItems.packagingPlaceholderMeasured')}
                  value={row.packaging}
                  onChange={(e) => updateRow(row.key, { packaging: e.target.value })}
                  className={`mt-1 ${INPUT}`}
                />
              </label>
              <label className="text-xs text-secondary dark:text-slate-400">
                {t('fields.unitOfMeasurement')}
                <input
                  type="text"
                  list="unit-of-measurement-suggestions"
                  placeholder={t('addItems.unitOfMeasurementPlaceholder')}
                  value={row.unitOfMeasurement}
                  onChange={(e) => updateRow(row.key, { unitOfMeasurement: e.target.value })}
                  className={`mt-1 ${INPUT}`}
                />
              </label>
              <label className="sm:col-span-2 text-xs text-secondary dark:text-slate-400">
                {t('common:status')}
                <ItemStatusSelect
                  value={row.itemStatus}
                  onChange={(itemStatus) => itemStatus && updateRow(row.key, { itemStatus })}
                  className={`mt-1 ${INPUT}`}
                />
              </label>
              {!row.isDiscrete && !row.hasContents && (
                <div className="sm:col-span-2">
                  <label className="text-xs text-secondary dark:text-slate-400">
                    {t('addItems.packageSizeLabel')}
                    <NumberInput
                      placeholder={t('addItems.packageSizePlaceholder')}
                      value={row.packageSize}
                      onValueChange={(packageSize) => updateRow(row.key, { packageSize })}
                      error={visibleError(row, 'packageSize')}
                      className={`mt-1 ${INPUT}`}
                    />
                  </label>
                  {row.packageSize.trim() !== '' && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                      <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                      {t('addItems.packageSizeHint')}
                    </p>
                  )}
                </div>
              )}
              <ItemUnitFields
                values={row}
                onChange={(patch) => updateRow(row.key, patch)}
                errorFor={(field) => visibleError(row, field)}
                inputClass={INPUT}
                selectClass={SELECT}
              />
            </div>
          </div>
        ))}

        <ItemSuggestionLists />

        <button type="button" onClick={addRow} className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium">
          <Plus className="w-4 h-4" />
          {t('addItems.addAnother')}
        </button>
      </div>
    </Modal>
  );
}
