import { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { useAddCategoryMutation } from '../../store/apis/categoryApi';
import type { AddCategoryComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';

export function AddCategoryComponent({
  isOpen,
  onClose,
  parentId,
  parentTitle,
  onSuccess,
}: AddCategoryComponentProps) {
  const [addCategory, { isLoading }] = useAddCategoryMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitAction = async (formData: FormData) => {
    const title = (formData.get('title') as string)?.trim();
    const rankInput = formData.get('rank');
    const rank = rankInput !== null && rankInput !== '' ? Number(rankInput) : 1;

    if (!title) return;

    setErrorMsg(null);

    try {
      const newCategoryId = await addCategory({
        title,
        parentId,
        rank,
      }).unwrap();

      onSuccess(newCategoryId);
      onClose();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Der opstod en fejl ved oprettelse.'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white border border-border-gray rounded-xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-secondary hover:text-primary p-1 rounded-lg hover:bg-bg-gray transition-colors"
          aria-label="Luk modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {parentId ? 'Opret underkategori' : 'Opret hovedkategori'}
            </h2>
            {parentId && parentTitle && (
              <p className="text-xs text-secondary mt-0.5">
                Forælder: <strong className="text-primary font-medium">{parentTitle}</strong>
              </p>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
            {errorMsg}
          </div>
        )}

        <form action={handleSubmitAction} className="space-y-4">
          <label className="block text-xs font-medium text-secondary">
            <div className="mb-1.5 flex items-center gap-1">
              Kategorinavn
              <span aria-hidden="true" className="text-red-600">*</span>
            </div>
            <input
              name="title"
              type="text"
              required
              aria-required="true"
              placeholder="F.eks. Elektronik, Kabler eller Værktøj..."
              className="w-full bg-white border border-border-gray rounded-lg px-3.5 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors font-normal"
            />
          </label>

          <label className="block text-xs font-medium text-secondary">
            <div className="mb-1.5">Sorteringsværdi (Rank)</div>
            <input
              name="rank"
              type="number"
              min="0"
              defaultValue={1}
              placeholder="1"
              className="w-full bg-white border border-border-gray rounded-lg px-3.5 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors font-normal"
            />
            <span className="text-[11px] text-secondary mt-1 block">
              Lavere tal vises først i kategoritræet.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-gray mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Gem kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}