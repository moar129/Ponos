import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useDeleteCategoryMutation } from '../../store/apis/categoryApi';
import type { DataLayerCat, SubCategoryCheckboxProps, DeleteCategoryComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';


function SubCategoryCheckbox({ category, depth, selectedIds, onToggle }: SubCategoryCheckboxProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasSubCategories = category.subCategories.length > 0;
  const isChecked = selectedIds.has(category.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 rounded-md hover:bg-slate-800/60 px-1.5"
        style={{ paddingLeft: `${depth * 20 + 6}px` }}
      >
        {hasSubCategories ? (
          <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-0.5 text-slate-400 hover:text-white shrink-0">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(category.id)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-[#C7975D] focus:ring-[#C7975D] shrink-0"
        />

        <span className="text-sm text-slate-200 truncate">{category.title}</span>
        {category.items.length > 0 && (
          <span className="text-xs text-slate-500 shrink-0">({category.items.length} items)</span>
        )}
        {isChecked && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0 ml-auto">
            Slettes
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
      setFormError(getErrorMessage(err, 'Kunne ikke slette alle valgte kategorier. Prøv igen.'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-slate-800">
          <div className="shrink-0 p-2 rounded-full bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-100">Slet "{category.title}"</h2>
            <p className="text-sm text-slate-400 mt-1">
              Vælg om underkategorier også skal slettes. Underkategorier du ikke vælger, bevares
              og rykkes op som selvstændige kategorier.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {formError && (
            <div className="p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <div className="flex items-center gap-2 py-1.5 px-1.5 rounded-md bg-slate-900 border border-slate-800 mb-1">
            <span className="w-4 shrink-0" />
            <input type="checkbox" checked disabled className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-[#C7975D] shrink-0" />
            <span className="text-sm font-medium text-slate-100 truncate">{category.title}</span>
            {category.items.length > 0 && (
              <span className="text-xs text-slate-500 shrink-0">({category.items.length} items)</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0 ml-auto">
              Slettes
            </span>
          </div>

          {category.subCategories.length > 0 ? (
            <div className="mt-1">
              {category.subCategories.map((sub) => (
                <SubCategoryCheckbox key={sub.id} category={sub} depth={1} selectedIds={selectedIds} onToggle={toggle} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">Ingen underkategorier.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            {itemsToDelete > 0 ? `${itemsToDelete} item(s) slettes sammen med kategorierne.` : 'Ingen items slettes.'}
          </p>
          <div className="flex items-center gap-3 shrink-0">
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
              Slet {selectedIds.size + 1} kategori{selectedIds.size > 0 ? 'er' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}