import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { useUpdateCategoryMutation } from '../../store/apis/categoryApi';
import type { DataLayerCat } from '../../types/dataLayer/datalayerTypes';

interface EditCategoryComponentProps {
  isOpen: boolean;
  onClose: () => void;
  category: DataLayerCat | null;
}

export function EditCategoryComponent({ isOpen, onClose, category }: EditCategoryComponentProps) {
  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [updateCategory, { isLoading }] = useUpdateCategoryMutation();

  useEffect(() => {
    if (category) {
      setTitle(category.title);
      setFormError(null);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError('Titel er påkrævet.');
      return;
    }

    try {
      await updateCategory({ id: category.id, title: title.trim() }).unwrap();
      onClose();
    } catch {
      setFormError('Kunne ikke gemme ændringer. Prøv igen.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Rediger kategori</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">
            Annullér
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Gem
          </button>
        </div>
      </div>
    </div>
  );
}