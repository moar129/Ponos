import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { X, Plus, Trash2, Loader2, Folder, ChevronDown, Info } from 'lucide-react';
import { useAddItemsMutation } from '../../../store/apis/categoryApi';
import type { AddItemsComponentProps, DataLayerCat, ItemRow } from '../../../types/dataLayer/datalayerTypes';
import {
  ALL_ITEM_STATUSES,
  UNIT_OF_MEASUREMENT_SUGGESTIONS,
  PACKAGING_SUGGESTIONS_DISCRETE,
  PACKAGING_SUGGESTIONS_MEASURED,
} from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';
import { LocationPickerComponent } from '../warehouse/locationsPickerComponent';


function emptyRow(): ItemRow {
  return {
    key: crypto.randomUUID(),
    name: '',
    description: '',
    packaging: '',
    unitOfMeasurement: 'stk',
    quantity: 1,
    itemStatus: 'Available',
    isDiscrete: true,
    serialNumbersRaw: '',
    hasContents: false,
    contentsTotal: 1,
    contentsStart: '',
    contentsEmptyStatus: 'Consumed',
    contentsPartialStatus: 'Missing',
    contentsFullStatus: 'Available',
    packageSize: '',
  };
}

// Flader kategori-træet ud til "Forælder > Forælder > Kategori"-labels,
// så man kan se hvor i hierarkiet man vælger, uden at skulle åbne
// træet selv. Samme mønster som editCategoryComponent.tsx bruger til sin
// "Overordnet kategori"-vælger.
function flattenWithPath(categories: DataLayerCat[], path: string[] = []): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const cat of categories) {
    const currentPath = [...path, cat.title];
    result.push({ id: cat.id, label: currentPath.join(' > ') });
    result.push(...flattenWithPath(cat.subCategories, currentPath));
  }
  return result;
}

export function AddItemsComponent({
  isOpen, onClose, categoryTree, categoryId, categoryTitle, onSuccess, canCreate,
}: AddItemsComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryId);
  const [formError, setFormError] = useState<string | null>(null);
  const [addItems, { isLoading }] = useAddItemsMutation();

  const categoryOptions = flattenWithPath(categoryTree);

  // Genstiller den forudvalgte kategori, hver gang modalen åbnes for en
  // ny kategori (fx hvis brugeren skifter kategori og trykker "Tilføj
  // items" igen) - uden dette ville et tidligere valg blive hængende.
  useEffect(() => {
    if (isOpen) setSelectedCategoryId(categoryId);
  }, [isOpen, categoryId]);

  if (!isOpen) return null;

  const updateRow = (key: string, patch: Partial<ItemRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (key: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const resetAndClose = () => {
    setRows([emptyRow()]);
    setLocationId(null);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedCategoryId) return setFormError(t('addItems.noCategory'));

    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) return setFormError(t('addItems.atLeastOne'));

    try {
      await addItems(
        validRows.map((r) => ({
          categoryId: selectedCategoryId,
          itemLocationId: locationId,
          name: r.name.trim(),
          description: r.description.trim() || null,
          packaging: r.packaging.trim() || null,
          unitOfMeasurement: r.unitOfMeasurement.trim() || 'stk',
          quantity: r.quantity,
          itemStatus: r.itemStatus,
          isDiscrete: r.isDiscrete,
          contentsTotal: r.hasContents ? r.contentsTotal : undefined,
          contentsStart: !r.isDiscrete && r.hasContents && r.contentsStart !== '' ? r.contentsStart : undefined,
          contentsEmptyStatus: r.hasContents ? r.contentsEmptyStatus || null : undefined,
          contentsPartialStatus: r.hasContents ? r.contentsPartialStatus || null : undefined,
          contentsFullStatus: r.hasContents ? r.contentsFullStatus || null : undefined,
          packageSize: !r.isDiscrete && !r.hasContents && r.packageSize !== '' ? r.packageSize : undefined,
          serialNumbers:
            r.isDiscrete && r.serialNumbersRaw.trim()
              ? r.serialNumbersRaw.split(',').map((s) => s.trim())
              : undefined,
        }))
      ).unwrap();

      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setFormError(getErrorMessage(err, t('addItems.createFailed')));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-primary dark:text-slate-100">{t('addItems.heading')}</h2>
            {categoryTitle && <p className="text-xs text-secondary mt-0.5 dark:text-slate-400">{t('addItems.suggestedCategory', { name: categoryTitle })}</p>}
          </div>
          <button type="button" onClick={resetAndClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100" title={t('close')} aria-label={t('closeModal')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-secondary dark:bg-accent/10 dark:border-accent/30 dark:text-slate-400">
            <p className="font-medium text-primary mb-1 dark:text-slate-100">{t('addItems.helpHeading')}</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>{t('addItems.helpDiscrete')}</li>
              <li>{t('addItems.helpMeasured')}</li>
              <li>{t('addItems.helpContainer')}</li>
            </ul>
          </div>

          <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg dark:bg-slate-800/40 dark:border-slate-700">
            <label className="block text-xs text-secondary uppercase tracking-wide mb-1.5 dark:text-slate-400">{t('fields.category')}</label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
              <select
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
            <p className="text-[11px] text-secondary mt-1.5 dark:text-slate-400">
              {t('addItems.categoryNote')}
            </p>
          </div>

          <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg dark:bg-slate-800/40 dark:border-slate-700">
            <LocationPickerComponent
              value={locationId}
              onChange={setLocationId}
              canCreate={canCreate}
            />
            <p className="text-[11px] text-secondary mt-1.5 dark:text-slate-400">
              {t('addItems.locationNote')}
            </p>
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

              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
                  <input
                    type="radio"
                    checked={row.isDiscrete}
                    onChange={() =>
                      updateRow(row.key, {
                        isDiscrete: true,
                        hasContents: false,
                        contentsEmptyStatus: 'Consumed',
                        contentsPartialStatus: 'Missing',
                        contentsFullStatus: 'Available',
                        // "stk" er kun et fornuftigt udgangspunkt for
                        // enkelt enhed - tomt felt ved skift til Mængde
                        // ville ellers skjule pladsholder-hintet ("fx kg,
                        // liter") bag den efterladte "stk"-værdi, så det så
                        // ud som om enheden var låst til stk.
                        ...(row.unitOfMeasurement === '' ? { unitOfMeasurement: 'stk' } : {}),
                      })
                    }
                  />
                  {t('addItems.discreteOption')}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
                  <input
                    type="radio"
                    checked={!row.isDiscrete && !row.hasContents}
                    onChange={() =>
                      updateRow(row.key, {
                        isDiscrete: false,
                        hasContents: false,
                        ...(row.unitOfMeasurement === 'stk' ? { unitOfMeasurement: '' } : {}),
                      })
                    }
                  />
                  {t('addItems.measuredOption')}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
                  <input
                    type="radio"
                    checked={!row.isDiscrete && row.hasContents}
                    onChange={() =>
                      updateRow(row.key, {
                        isDiscrete: false,
                        hasContents: true,
                        // Kind-afhængige defaults (opfølgning 4) - en
                        // beholder skal ikke arve 12-pack'ens "tom=Brugt
                        // op"-default, som ikke giver mening for en tank.
                        contentsEmptyStatus: 'NeedsRefilling',
                        contentsPartialStatus: '',
                        contentsFullStatus: 'Available',
                        ...(row.unitOfMeasurement === 'stk' ? { unitOfMeasurement: '' } : {}),
                      })
                    }
                  />
                  {t('addItems.containerOption')}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-xs text-secondary dark:text-slate-400">
                  {t('addItems.namePlaceholder')}
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.key, { name: e.target.value })}
                    className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </label>
                <label className="text-xs text-secondary dark:text-slate-400">
                  {t(
                    row.isDiscrete
                      ? 'addItems.quantityPlaceholder'
                      : row.hasContents
                      ? 'addItems.containerCountPlaceholder'
                      : row.packageSize !== ''
                      ? 'addItems.packageCountLabel'
                      : 'addItems.measuredQuantityPlaceholder'
                  )}
                  <input
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                    className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </label>
                <label className="sm:col-span-2 text-xs text-secondary dark:text-slate-400">
                  {t('addItems.descriptionPlaceholder')}
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </label>
                <label className="text-xs text-secondary dark:text-slate-400">
                  {t('fields.packaging')}
                  <input
                    type="text"
                    list={row.isDiscrete ? 'packaging-suggestions-discrete' : 'packaging-suggestions-measured'}
                    placeholder={t(row.isDiscrete ? 'addItems.packagingPlaceholder' : 'addItems.packagingPlaceholderMeasured')}
                    value={row.packaging}
                    onChange={(e) => updateRow(row.key, { packaging: e.target.value })}
                    className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
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
                    className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </label>
                <label className="sm:col-span-2 text-xs text-secondary dark:text-slate-400">
                  {t('fields.status')}
                  <select
                    value={row.itemStatus}
                    onChange={(e) => updateRow(row.key, { itemStatus: e.target.value as (typeof ALL_ITEM_STATUSES)[number] })}
                    className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  >
                    {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                  </select>
                </label>
                {row.isDiscrete && (
                  <label className="sm:col-span-2 text-xs text-secondary dark:text-slate-400">
                    {t('addItems.serialNumbersPlaceholder')}
                    <input
                      type="text"
                      value={row.serialNumbersRaw}
                      onChange={(e) => updateRow(row.key, { serialNumbersRaw: e.target.value })}
                      className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </label>
                )}
                {!row.isDiscrete && !row.hasContents && (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('addItems.packageSizeLabel')}
                      <input
                        type="number"
                        min={0}
                        placeholder={t('addItems.packageSizePlaceholder')}
                        value={row.packageSize}
                        onChange={(e) => updateRow(row.key, { packageSize: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </label>
                    {row.packageSize !== '' && (
                      <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        {t('addItems.packageSizeHint')}
                      </p>
                    )}
                  </div>
                )}
                {row.isDiscrete && (
                  <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={row.hasContents}
                      onChange={(e) => updateRow(row.key, { hasContents: e.target.checked })}
                    />
                    {t('addItems.hasContentsOption')}
                  </label>
                )}
                {row.hasContents && (
                  <div>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t(row.isDiscrete ? 'addItems.contentsTotalPlaceholder' : 'addItems.contentsTotalPlaceholderMeasured')}
                      <input
                        type="number"
                        min={1}
                        value={row.contentsTotal}
                        onChange={(e) => updateRow(row.key, { contentsTotal: Number(e.target.value) })}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </label>
                    {row.isDiscrete && (
                      <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        {t('addItems.hasContentsHint')}
                      </p>
                    )}
                  </div>
                )}
                {!row.isDiscrete && row.hasContents && (
                  <div>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('addItems.contentsStartPlaceholder')}
                      <input
                        type="number"
                        min={0}
                        value={row.contentsStart}
                        onChange={(e) => updateRow(row.key, { contentsStart: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </label>
                    <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                      <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                      {t('addItems.containerLevelHint')}
                    </p>
                  </div>
                )}
                {row.hasContents && (
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <p className="sm:col-span-3 text-[11px] text-secondary uppercase tracking-wide dark:text-slate-400">
                      {t('addItems.contentsStatusHeading')}
                    </p>
                    <p className="sm:col-span-3 -mt-1 flex items-start gap-1 text-[11px] text-secondary normal-case dark:text-slate-400">
                      <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                      {t('addItems.contentsStatusHint')}
                    </p>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('addItems.contentsEmptyStatusLabel')}
                      <select
                        value={row.contentsEmptyStatus}
                        onChange={(e) => updateRow(row.key, { contentsEmptyStatus: e.target.value as ItemRow['contentsEmptyStatus'] })}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      >
                        <option value="">{t('addItems.contentsStatusNoChange')}</option>
                        {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('addItems.contentsPartialStatusLabel')}
                      <select
                        value={row.contentsPartialStatus}
                        onChange={(e) => updateRow(row.key, { contentsPartialStatus: e.target.value as ItemRow['contentsPartialStatus'] })}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      >
                        <option value="">{t('addItems.contentsStatusNoChange')}</option>
                        {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('addItems.contentsFullStatusLabel')}
                      <select
                        value={row.contentsFullStatus}
                        onChange={(e) => updateRow(row.key, { contentsFullStatus: e.target.value as ItemRow['contentsFullStatus'] })}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      >
                        <option value="">{t('addItems.contentsStatusNoChange')}</option>
                        {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}

          <datalist id="unit-of-measurement-suggestions">
            {UNIT_OF_MEASUREMENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
          <datalist id="packaging-suggestions-discrete">
            {PACKAGING_SUGGESTIONS_DISCRETE.map((s) => <option key={s} value={s} />)}
          </datalist>
          <datalist id="packaging-suggestions-measured">
            {PACKAGING_SUGGESTIONS_MEASURED.map((s) => <option key={s} value={s} />)}
          </datalist>

          <button type="button" onClick={addRow} className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium">
            <Plus className="w-4 h-4" />
            {t('addItems.addAnother')}
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray dark:border-slate-700">
          <button type="button" onClick={resetAndClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('addItems.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}