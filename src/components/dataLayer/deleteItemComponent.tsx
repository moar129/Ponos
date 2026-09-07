// components/dataLayer/deleteItemsComponent.tsx
import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useDeleteItemMutation } from '../../store/apis/categoryApi';
import type { DeleteItemsComponentProps } from '../../types/dataLayer/datalayerTypes';


export function DeleteItemsComponent({ isOpen, items, onClose, onDeleted }: DeleteItemsComponentProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteItem] = useDeleteItemMutation();

  if (!isOpen || items.length === 0) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setFormError(null);

    try {
      const ids = items.map((item) => item.id);
      await Promise.all(ids.map((id) => deleteItem({ id }).unwrap()));
      onDeleted(ids);
      onClose();
    } catch {
      setFormError('Kunne ikke slette alle valgte items. Prøv igen.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-slate-800">
          <div className="shrink-0 p-2 rounded-full bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100">
              Slet {items.length} item{items.length > 1 ? 's' : ''}?
            </h2>
            <p className="text-sm text-slate-400 mt-1">Dette kan ikke fortrydes.</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-1">
          {formError && (
            <div className="p-3 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-sm text-slate-200 truncate">{item.name}</span>
              {item.isFromSubCategory && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 ml-2">
                  {item.sourceCategoryTitle}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
            Annullér
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Slet {items.length}
          </button>
        </div>
      </div>
    </div>
  );
}