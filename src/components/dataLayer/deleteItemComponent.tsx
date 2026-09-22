import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useDeleteItemMutation } from '../../store/apis/categoryApi';
import type { DeleteItemsComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';


export function DeleteItemsComponent({ isOpen, items, onClose, onDeleted }: DeleteItemsComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
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
    } catch (err) {
      setFormError(getErrorMessage(err, t('deleteItems.deleteFailed')));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-border-gray dark:border-slate-700">
          <div className="shrink-0 p-2 rounded-full bg-red-50 dark:bg-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-primary dark:text-slate-100">
              {t('deleteItems.heading', { count: items.length })}
            </h2>
            <p className="text-sm text-secondary mt-1 dark:text-slate-400">{t('deleteItems.cannotUndo')}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-bg-gray text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-1">
          {formError && (
            <div className="p-3 mb-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-gray/40 border border-border-gray dark:bg-slate-800/40 dark:border-slate-700">
              <span className="text-sm text-primary truncate dark:text-slate-100">{item.name}</span>
              {item.isFromSubCategory && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-bg-gray text-secondary ml-2 dark:bg-slate-700 dark:text-slate-400">
                  {item.sourceCategoryTitle}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('deleteItems.submit', { count: items.length })}
          </button>
        </div>
      </div>
    </div>
  );
}