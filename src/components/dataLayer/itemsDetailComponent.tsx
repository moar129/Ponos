import { useState, useEffect } from 'react';
import { X, Package, Pencil, Loader2, Save } from 'lucide-react';
import { useUpdateItemMutation } from '../../store/apis/categoryApi';
import type { DataLayerItem, AggregatedItem } from '../../types/dataLayer/datalayerTypes';

interface ItemDetailComponentProps {
  item: AggregatedItem | null;
  onClose: () => void;
}

type ItemStatus = DataLayerItem['itemStatus'];

const STATUS_OPTIONS: ItemStatus[] = [
  'Available', 'Reserved', 'OutOfStock', 'InUse', 'Missing', 'Damaged', 'Maintenance',
];

const STATUS_STYLES: Record<string, string> = {
  Available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Reserved: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OutOfStock: 'bg-red-500/10 text-red-400 border-red-500/20',
  InUse: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Missing: 'bg-red-500/10 text-red-400 border-red-500/20',
  Damaged: 'bg-red-500/10 text-red-400 border-red-500/20',
  Maintenance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function ItemDetailComponent({ item, onClose }: ItemDetailComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [itemStatus, setItemStatus] = useState<ItemStatus>('Available');
  const [formError, setFormError] = useState<string | null>(null);

  const [updateItem, { isLoading }] = useUpdateItemMutation();

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description ?? '');
      setQuantity(item.quantity);
      setItemStatus(item.itemStatus);
      setIsEditing(false);
      setFormError(null);
    }
  }, [item]);

  if (!item) return null;

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Navn er påkrævet.');
      return;
    }

    try {
      await updateItem({
        id: item.id,
        name: name.trim(),
        description: description.trim() || null,
        quantity,
        itemStatus,
      }).unwrap();

      handleClose(); // luk modalen, så listen viser opdaterede data
    } catch {
      setFormError('Kunne ikke gemme ændringer. Prøv igen.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-5 h-5 text-[#C7975D] shrink-0" />
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
              />
            ) : (
              <h2 className="text-lg font-semibold text-slate-100 truncate">{item.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Rediger item"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          {isEditing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivelse"
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
            />
          ) : (
            <p className="text-sm text-slate-300">{item.description || 'Ingen beskrivelse'}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Antal</span>
              {isEditing ? (
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
                />
              ) : (
                <span className="text-slate-200">{item.quantity}</span>
              )}
            </div>
            <div>
              <span className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Status</span>
              {isEditing ? (
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value as ItemStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
                >
                  {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              ) : (
                <span className={`inline-block px-2 py-0.5 rounded border text-xs ${STATUS_STYLES[item.itemStatus] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  {item.itemStatus}
                </span>
              )}
            </div>
            {item.isFromSubCategory && !isEditing && (
              <div className="col-span-2">
                <span className="block text-xs text-slate-500 uppercase tracking-wide mb-1">Kategori</span>
                <span className="text-slate-200">{item.sourceCategoryTitle}</span>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { setIsEditing(false); setFormError(null); }}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              Annullér
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Gem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}