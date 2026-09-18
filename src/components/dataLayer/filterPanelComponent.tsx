import type { FilterPanelComponentProps } from '../../types/dataLayer/datalayerTypes';
import { ITEM_STATUS_STYLES, ITEM_STATUS_LABELS } from '../../types/dataLayer/datalayerTypes';


export function FilterPanelComponent({
  isOpen,
  categories,
  statuses,
  selectedCategoryIds,
  selectedStatuses,
  onToggleCategory,
  onToggleStatus,
  onClear,
  onClose,
}: FilterPanelComponentProps) {
  if (!isOpen) return null;

  const hasActiveFilters = selectedCategoryIds.size > 0 || selectedStatuses.size > 0;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

     <div className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] bg-white border border-border-gray rounded-xl shadow-xl p-4 space-y-4 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary dark:text-slate-100">Filter</h3>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="text-xs text-accent hover:text-accent-hover">
              Ryd filtre
            </button>
          )}
        </div>

        <div>
          <p className="text-xs text-secondary uppercase tracking-wide mb-2 dark:text-slate-400">Status</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {statuses.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm text-primary cursor-pointer dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(status)}
                  onChange={() => onToggleStatus(status)}
                  className="w-4 h-4 rounded border-border-gray bg-white text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                />
                <span className={`px-2 py-0.5 rounded border text-sm ${ITEM_STATUS_STYLES[status]}`}>
                  {ITEM_STATUS_LABELS[status]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {categories.length > 1 && (
          <div>
            <p className="text-xs text-secondary uppercase tracking-wide mb-2 dark:text-slate-400">Kategori</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm text-primary cursor-pointer dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.has(cat.id)}
                    onChange={() => onToggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-border-gray bg-white text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span className="truncate">{cat.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}