import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next'
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { useAddCategoryMutation } from '../../../store/apis/categoryApi';
import type { AddCategoryComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';

export function AddCategoryComponent({
  isOpen,
  onClose,
  parentId,
  parentPath,
  nextRank,
  onSuccess,
}: AddCategoryComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [addCategory, { isLoading }] = useAddCategoryMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitAction = async (formData: FormData) => {
    const title = (formData.get('title') as string)?.trim();

    if (!title) {
      setErrorMsg(t('addCategory.titleRequired'));
      return;
    }

    setErrorMsg(null);

    try {
      const newCategoryId = await addCategory({
        title,
        parentId,
        rank: nextRank,
      }).unwrap();

      onSuccess(newCategoryId);
      onClose();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, t('addCategory.createFailed')));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-border-gray rounded-xl shadow-2xl p-6 relative dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-secondary hover:text-primary p-1 rounded-lg hover:bg-bg-gray transition-colors dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700"
          aria-label={t('closeModal')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg text-accent">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary dark:text-slate-100">
              {parentId ? t('addCategory.titleSub') : t('addCategory.titleMain')}
            </h2>
            {parentId && parentPath && parentPath.length > 0 && (
              <p className="text-xs text-secondary mt-0.5 dark:text-slate-400">
                <Trans ns="datalayer" i18nKey="addCategory.parentPath" values={{ path: parentPath.join(' > ') }} components={{ b: <strong className="text-primary font-medium dark:text-slate-100" /> }} />
              </p>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400" role="alert">
            {errorMsg}
          </div>
        )}

        <form action={handleSubmitAction} className="space-y-4">
          <label className="block text-xs font-medium text-secondary dark:text-slate-400">
            <div className="mb-1.5 flex items-center gap-1">
              {t('addCategory.nameLabel')}
              <span aria-hidden="true" className="text-red-600 dark:text-red-400">*</span>
            </div>
            <input
              name="title"
              type="text"
              required
              aria-required="true"
              placeholder={t('addCategory.placeholder')}
              className="w-full bg-white border border-border-gray rounded-lg px-3.5 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors font-normal dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-gray mt-6 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('addCategory.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}