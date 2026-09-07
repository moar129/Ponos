// components/dataLayer/AddItemsComponent.tsx
import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAddItemsMutation } from '../../store/apis/categoryApi';
import type { AddItemsComponentProps, ItemRow, ItemStatus } from '../../types/dataLayer/datalayerTypes';


const STATUS_OPTIONS: ItemStatus[] = [
  'Available', 'Reserved', 'OutOfStock', 'InUse', 'Missing', 'Damaged', 'Maintenance',
];

function emptyRow(): ItemRow {
  return { key: crypto.randomUUID(), name: '', description: '', quantity: 1, itemStatus: 'Available' };
}

export function AddItemsComponent({
  isOpen, onClose, categoryId, categoryTitle, onSuccess,
}: AddItemsComponentProps) {
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
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
        itemLocationId: '', // eller fra et lokations-dropdown, se note ovenfor
        name: r.name.trim(),
        description: r.description.trim() || null,
        quantity: r.quantity,
        itemStatus: r.itemStatus,
      }))
    ).unwrap();

    onSuccess?.();
    resetAndClose();
  } catch {
    setFormError('Kunne ikke oprette items. Prøv igen.');
  }
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Tilføj items</h2>
            {categoryTitle && <p className="text-xs text-slate-400 mt-0.5">Til kategori: {categoryTitle}</p>}
          </div>
          <button onClick={resetAndClose} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          {rows.map((row, idx) => (
            <div key={row.key} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Item {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                  title="Fjern item"
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
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Antal"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: Number(e.target.value) })}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
                />
                <input
                  type="text"
                  placeholder="Beskrivelse"
                  value={row.description}
                  onChange={(e) => updateRow(row.key, { description: e.target.value })}
                  className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
                />
                <select
                  value={row.itemStatus}
                  onChange={(e) => updateRow(row.key, { itemStatus: e.target.value as ItemStatus })}
                  className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
                >
                  {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRow} className="flex items-center gap-2 text-sm text-[#C7975D] hover:text-[#e0ac6f] font-medium">
            <Plus className="w-4 h-4" />
            Tilføj endnu et item
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800">
          <button type="button" onClick={resetAndClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
            Annullér
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Opret items
          </button>
        </div>
      </div>
    </div>
  );
}