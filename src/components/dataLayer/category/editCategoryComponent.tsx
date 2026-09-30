import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { Loader2, Save } from 'lucide-react';
import { useUpdateCategoryMutation } from '../../../store/apis/categoryApi';
import { findCategoryInTree, flattenWithPath, getDescendantCategories } from '../../../store/slices/dataLayersSlices/aggregatedItems';
import type { EditCategoryComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';
import { Alert } from '../../common/Alert';
import { Modal } from '../../common/Modal';

const LABEL = 'block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400';
const INPUT = 'w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';

// Kalderen mounter kun modalen mens den er åben (key = kategorien), så
// felterne altid starter fra kategoriens nuværende værdier.
export function EditCategoryComponent({ onClose, category, categoryTree }: EditCategoryComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [title, setTitle] = useState(category.title);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(category.parentCategoryId);
  const [formError, setFormError] = useState<string | null>(null);
  const [updateCategory, { isLoading }] = useUpdateCategoryMutation();

  // En kategori kan ikke flyttes ind under sig selv eller sine efterkommere.
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
    <Modal
      onClose={onClose}
      title={t('editCategory.heading')}
      closeOnBackdrop={false}
      disableClose={isLoading}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common:save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert>{formError}</Alert>

        <div>
          <label htmlFor="edit-category-title" className={LABEL}>{t('common:title')}</label>
          <input id="edit-category-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
        </div>

        <div>
          <label htmlFor="edit-category-parent" className={LABEL}>{t('fields.parentCategory')}</label>
          <select
            id="edit-category-parent"
            value={selectedParentId ?? ''}
            onChange={(e) => setSelectedParentId(e.target.value || null)}
            className={INPUT}
          >
            <option value="">{t('editCategory.noParent')}</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
