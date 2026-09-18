import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAddItemsMutation } from '../../store/apis/categoryApi';
import type { AddItemsComponentProps, ItemRow } from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';
import { LocationPickerComponent } from './locationsPickerComponent';


function emptyRow(): ItemRow {
  return { key: crypto.randomUUID(), name: '', description: '', quantity: 1, itemStatus: 'Available' };
}

export function AddItemsComponent({
  isOpen, onClose, categoryId, categoryTitle, onSuccess, canCreate, canUpdate, canDelete,
}: AddItemsComponentProps) {
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [addItems, { isLoading }] = useAddItemsMutation();

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
    if (!categoryId) return setFormError('Ingen kategori valgt.');

    const validRows = rows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) return setFormError('Tilføj mindst ét item med et navn.');

    try {
      await addItems(
        validRows.map((r) => ({
          categoryId,
          itemLocationId: locationId,
          name: r.name.trim(),
          description: r.description.trim() || null,
          quantity: r.quantity,
          itemStatus: r.itemStatus,
        }))
      ).unwrap();

      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Kunne ikke oprette items. Prøv igen.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-primary dark:text-slate-100">Tilføj items</h2>
            {categoryTitle && <p className="text-xs text-secondary mt-0.5 dark:text-slate-400">Til kategori: {categoryTitle}</p>}
          </div>
          <button type="button" onClick={resetAndClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100" title="Luk" aria-label="Luk modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

          <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg dark:bg-slate-800/40 dark:border-slate-700">
            <LocationPickerComponent
              value={locationId}
              onChange={setLocationId}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
            <p className="text-[11px] text-secondary mt-1.5 dark:text-slate-400">
              Denne lokation bruges til alle items i denne oprettelse.
            </p>
          </div>

          {rows.map((row, idx) => (
            <div key={row.key} className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg space-y-2 dark:bg-slate-800/40 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary uppercase tracking-wide dark:text-slate-400">Item {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  className="p-1 rounded text-secondary hover:text-red-600 hover:bg-red-50 disabled:opacity-30 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                  title="Fjern item"
                  aria-label="Fjern item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Navn *"
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  className="bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Antal"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                  className="bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder="Beskrivelse"
                  value={row.description}
                  onChange={(e) => updateRow(row.key, { description: e.target.value })}
                  className="sm:col-span-2 bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <select
                  value={row.itemStatus}
                  onChange={(e) => updateRow(row.key, { itemStatus: e.target.value as (typeof ALL_ITEM_STATUSES)[number] })}
                  className="sm:col-span-2 bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium">
            <Plus className="w-4 h-4" />
            Tilføj endnu et item
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray dark:border-slate-700">
          <button type="button" onClick={resetAndClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            Annullér
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Opret items
          </button>
        </div>
      </div>
    </div>
  );
}