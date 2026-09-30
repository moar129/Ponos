import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useDeleteCategoryMutation } from '../../../store/apis/categoryApi';
import { useDeleteMany } from '../../../store/hooks/useDeleteMany';
import { toggleInSet } from '../../../utils/toggle';
import type { DataLayerCat, SubCategoryCheckboxProps, DeleteCategoryComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { ConfirmDialog } from '../../common/ConfirmDialog';


function SubCategoryCheckbox({ category, depth, selectedIds, onToggle }: SubCategoryCheckboxProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [isOpen, setIsOpen] = useState(true);
  const hasSubCategories = category.subCategories.length > 0;
  const isChecked = selectedIds.has(category.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 rounded-md hover:bg-bg-gray/60 px-1.5 dark:hover:bg-slate-700/60"
        style={{ paddingLeft: `${depth * 20 + 6}px` }}
      >
        {hasSubCategories ? (
          <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-0.5 text-secondary hover:text-primary shrink-0 dark:text-slate-400 dark:hover:text-slate-100">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(category.id)}
          className="w-4 h-4 rounded border-border-gray bg-white text-accent focus:ring-accent shrink-0 dark:border-slate-700 dark:bg-slate-800"
        />

        <span className="text-sm text-primary truncate dark:text-slate-100">{category.title}</span>
        {category.items.length > 0 && (
          <span className="text-xs text-secondary shrink-0 dark:text-slate-400">{t('itemCountParen', { count: category.items.length })}</span>
        )}
        {isChecked && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 shrink-0 ml-auto dark:bg-red-900/30 dark:text-red-400">
            {t('deleteCategory.willBeDeleted')}
          </span>
        )}
      </div>

      {isOpen && hasSubCategories && (
        <div>
          {category.subCategories.map((sub) => (
            <SubCategoryCheckbox key={sub.id} category={sub} depth={depth + 1} selectedIds={selectedIds} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// Kalderen mounter kun dialogen mens den er åben (key = kategorien), så
// valget altid starter tomt.
export function DeleteCategoryComponent({ category, onClose, onDeleted }: DeleteCategoryComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteCategory] = useDeleteCategoryMutation();
  const { deleteAll, isDeleting, error } = useDeleteMany((id) => deleteCategory({ id }).unwrap(), t('deleteCategory.deleteFailed'));

  const toggle = (id: string) => setSelectedIds((prev) => toggleInSet(prev, id));

  // Tæller items der reelt forsvinder: kategoriens egne items + items i valgte underkategorier (rekursivt)
  function itemsForSelected(cat: DataLayerCat, isSelected: boolean): number {
    let count = isSelected ? cat.items.length : 0;
    for (const sub of cat.subCategories) {
      count += itemsForSelected(sub, selectedIds.has(sub.id));
    }
    return count;
  }

  const itemsToDelete = itemsForSelected(category, true);

  const handleConfirm = async () => {
    // Rækkefølge er ligegyldig: parent_category_id sættes automatisk til NULL
    // for underkategorier, der ikke er valgt til sletning.
    const idsToDelete = [category.id, ...selectedIds];
    if (await deleteAll(idsToDelete)) {
      onDeleted(idsToDelete);
      onClose();
    }
  };

  return (
    <ConfirmDialog
      title={t('deleteCategory.heading', { name: category.title })}
      message={t('deleteCategory.intro')}
      confirmLabel={t('deleteCategory.submit', { count: selectedIds.size + 1 })}
      isLoading={isDeleting}
      error={error}
      onConfirm={handleConfirm}
      onCancel={onClose}
    >
          <div className="flex items-center gap-2 py-1.5 px-1.5 rounded-md bg-bg-gray/40 border border-border-gray mb-1 dark:bg-slate-800/40 dark:border-slate-700">
            <span className="w-4 shrink-0" />
            <input type="checkbox" checked disabled className="w-4 h-4 rounded border-border-gray bg-white text-accent shrink-0 dark:border-slate-700 dark:bg-slate-800" />
            <span className="text-sm font-medium text-primary truncate dark:text-slate-100">{category.title}</span>
            {category.items.length > 0 && (
              <span className="text-xs text-secondary shrink-0 dark:text-slate-400">{t('itemCountParen', { count: category.items.length })}</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 shrink-0 ml-auto dark:bg-red-900/30 dark:text-red-400">
              {t('deleteCategory.willBeDeleted')}
            </span>
          </div>

          {category.subCategories.length > 0 ? (
            <div className="mt-1">
              {category.subCategories.map((sub) => (
                <SubCategoryCheckbox key={sub.id} category={sub} depth={1} selectedIds={selectedIds} onToggle={toggle} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-secondary mt-2 dark:text-slate-400">{t('deleteCategory.noSubcategories')}</p>
          )}

          <p className="mt-3 text-xs text-secondary dark:text-slate-400">
            {itemsToDelete > 0 ? t('deleteCategory.itemsDeleted', { count: itemsToDelete }) : t('deleteCategory.noItemsDeleted')}
          </p>
    </ConfirmDialog>
  );
}