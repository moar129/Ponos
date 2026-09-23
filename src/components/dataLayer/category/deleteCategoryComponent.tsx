import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useDeleteCategoryMutation } from '../../../store/apis/categoryApi';
import type { DataLayerCat, SubCategoryCheckboxProps, DeleteCategoryComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';


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

export function DeleteCategoryComponent({ isOpen, category, onClose, onDeleted }: DeleteCategoryComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteCategory] = useDeleteCategoryMutation();

  useEffect(() => {
    // Nulstil valg hver gang der åbnes en ny kategori til sletning
    setSelectedIds(new Set());
    setFormError(null);
    setIsDeleting(false);
  }, [category]);

  if (!isOpen || !category) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    setIsDeleting(true);
    setFormError(null);

    const idsToDelete = [category.id, ...selectedIds];

    try {
      // Rækkefølge er ligegyldig: parent_category_id sættes automatisk til NULL
      // for underkategorier, der ikke er valgt til sletning.
      await Promise.all(idsToDelete.map((id) => deleteCategory({ id }).unwrap()));
      onDeleted(idsToDelete);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, t('deleteCategory.deleteFailed')));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-border-gray dark:border-slate-700">
          <div className="shrink-0 p-2 rounded-full bg-red-50 dark:bg-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-primary dark:text-slate-100">{t('deleteCategory.heading', { name: category.title })}</h2>
            <p className="text-sm text-secondary mt-1 dark:text-slate-400">
              {t('deleteCategory.intro')}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-bg-gray text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {formError && (
            <div className="p-3 mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

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
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-border-gray dark:border-slate-700">
          <p className="text-xs text-secondary dark:text-slate-400">
            {itemsToDelete > 0 ? t('deleteCategory.itemsDeleted', { count: itemsToDelete }) : t('deleteCategory.noItemsDeleted')}
          </p>
          <div className="flex items-center gap-3 shrink-0">
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
              {t('deleteCategory.submit', { count: selectedIds.size + 1 })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}