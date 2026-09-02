import { useState } from 'react';
import { useAppDispatch } from '../../store/hooks/hooksCategory';
import { addCategoryThunk, fetchCategoriesThunk } from '../../store/slices/categorySlice';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import type { AddCategoryComponentProps } from '../../types/dataLayer/datalayerTypes';

export function AddCategoryComponent({
  isOpen,
  onClose,
  parentId,
  parentTitle,
  onSuccess,
}: AddCategoryComponentProps) {
  const dispatch = useAppDispatch();
  const [titel, setTitel] = useState('');
  const [ranked, setRanked] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titel.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    const action = await dispatch(
      addCategoryThunk({
        title: titel.trim(),
        parentId,
        rank: Number(ranked) || 1,
      })
    );

    setLoading(false);

    if (addCategoryThunk.fulfilled.match(action)) {
      setTitel('');
      setRanked(1);
      await dispatch(fetchCategoriesThunk());
      onSuccess(action.payload.id);
      onClose();
    } else {
      setErrorMsg((action.payload as string) || 'Der opstod en fejl ved oprettelse.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0B132A] border border-slate-800 rounded-xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#C7975D]/10 rounded-lg text-[#C7975D]">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {parentId ? 'Opret underkategori' : 'Opret hovedkategori'}
            </h2>
            {parentId && parentTitle && (
              <p className="text-xs text-slate-400 mt-0.5">
                Forælder: <span className="text-slate-200 font-medium">{parentTitle}</span>
              </p>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Kategorinavn <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="F.eks. Elektronik, Kabler eller Værktøj..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Sortering (Ranked)
            </label>
            <input
              type="number"
              min="1"
              value={ranked}
              onChange={(e) => setRanked(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D] transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={loading || !titel.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Gem kategori</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}