import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'
import { X, Loader2, Save } from 'lucide-react';
import { useUpdateCategoryMutation } from '../../store/apis/categoryApi';
import { getDescendantCategories } from '../../store/slices/dataLayersSlices/aggregatedItems';
import type { DataLayerCat, EditCategoryComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';

function findCategoryInTree(categories: DataLayerCat[], id: string): DataLayerCat | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    const found = findCategoryInTree(cat.subCategories, id);
    if (found) return found;
  }
  return null;
}

function flattenWithPath(categories: DataLayerCat[], path: string[] = []): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const cat of categories) {
    const currentPath = [...path, cat.title];
    result.push({ id: cat.id, label: currentPath.join(' > ') });
    result.push(...flattenWithPath(cat.subCategories, currentPath));
  }
  return result;
}

export function EditCategoryComponent({ isOpen, onClose, category, categoryTree }: EditCategoryComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [title, setTitle] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [updateCategory, { isLoading }] = useUpdateCategoryMutation();

  useEffect(() => {
    if (category) {
      setTitle(category.title);
      setSelectedParentId(category.parentCategoryId);
      setFormError(null);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const excludedIds = new Set(getDescendantCategories(category).map((c) => c.id));
  const parentOptions = flattenWithPath(categoryTree).filter((opt) => !excludedIds.has(opt.id));

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError(t('addCategory.titleRequired'));
      return;
    }

    const payload: { id: string; title: string; parentId?: string | null; rank?: number } = {
      id: category.id,
      title: title.trim(),
    };

    if (selectedParentId !== category.parentCategoryId) {
      const siblings = selectedParentId
        ? findCategoryInTree(categoryTree, selectedParentId)?.subCategories ?? []
        : categoryTree;
      payload.parentId = selectedParentId;
      payload.rank = siblings.length + 1;
    }

    try {
      await updateCategory(payload).unwrap();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, t('editCategory.saveFailed')));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-md dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary dark:text-slate-100">{t('editCategory.heading')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
            title={t('close')}
            aria-label={t('closeModal')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.parentCategory')}</label>
            <select
              value={selectedParentId ?? ''}
              onChange={(e) => setSelectedParentId(e.target.value || null)}
              className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            >
              <option value="">{t('editCategory.noParent')}</option>
              {parentOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common:save')}
          </button>
        </div>
      </div>
    </div>
  );
}