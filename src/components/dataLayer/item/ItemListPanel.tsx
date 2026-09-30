// src/components/dataLayer/item/ItemListPanel.tsx
import { useTranslation } from 'react-i18next'
import { Box, Filter, Plus, Search, Trash2, X as XIcon } from 'lucide-react'
import { formatItemQuantity } from '../../../types/dataLayer/datalayerTypes'
import type { ItemListPanelProps } from '../../../types/dataLayer/datalayerTypes'
import { ItemStatusBadges } from '../itemStatusBadgesComponent'
import { ItemLocationTag } from '../warehouse/itemLocationTagComponent'
import { ItemCategoryTag } from '../category/itemCategoryTagComponent'
import { SummaryChips } from '../summaryChipsComponent'

const SECONDARY_BUTTON =
  'flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700'
const EMPTY_BOX =
  'flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30'

// Overskrift + knapper, oversigts-chips, søgning, "vælg til sletning" og
// selve item-listen - ens for kategori- og lager-visningen, som før var to
// kopier (og var begyndt at søge forskelligt).
export function ItemListPanel({
  heading,
  chipsTitle,
  chips,
  searchPlaceholder,
  search,
  onSearchChange,
  totalCount,
  items,
  emptyText,
  placementIds,
  locationsById,
  onOpenItem,
  onClearFilters,
  onAddItems,
  canCreate,
  canDelete,
  isSelectMode,
  selectedIds,
  onToggleSelected,
  onEnterSelectMode,
  onExitSelectMode,
  onDeleteSelected,
}: ItemListPanelProps) {
  const { t } = useTranslation(['datalayer', 'common'])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-gray dark:border-slate-700">
        <div className="min-w-0">{heading}</div>

        <div className="flex items-center gap-2 shrink-0">
          {canDelete && (isSelectMode ? (
            <button type="button" onClick={onExitSelectMode} className={SECONDARY_BUTTON}>
              <XIcon className="w-4 h-4" />
              <span>{t('common:cancel')}</span>
            </button>
          ) : (
            <button type="button" onClick={onEnterSelectMode} disabled={items.length === 0} className={SECONDARY_BUTTON}>
              <span>{t('page.selectForDeletion')}</span>
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onClick={onAddItems}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('page.addItems')}</span>
            </button>
          )}
        </div>
      </div>

      <SummaryChips title={chipsTitle} chips={chips} />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-4 py-1.5 text-sm text-primary focus:outline-none focus:border-accent transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
        />
      </div>

      {isSelectMode && (
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-bg-gray/40 border border-border-gray gap-2 dark:bg-slate-800/40 dark:border-slate-700">
          <span className="text-sm text-secondary shrink-0 dark:text-slate-400">{t('common:selectedCount', { count: selectedIds.size })}</span>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={selectedIds.size === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              selectedIds.size === 0
                ? 'bg-red-100 text-red-300 cursor-not-allowed dark:bg-red-900/30 dark:text-red-800'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('page.deleteSelected')}</span>
            <span className="sm:hidden">{t('common:delete')}</span>
          </button>
        </div>
      )}

      {totalCount > 0 && items.length === 0 ? (
        <div className={EMPTY_BOX}>
          <Filter className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
          <p className="text-base font-medium text-primary dark:text-slate-100">{t('page.noItemsMatch')}</p>
          <button type="button" onClick={onClearFilters} className="text-xs text-accent hover:text-accent-hover mt-2">
            {t('filter.clear')}
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-border-gray border border-border-gray rounded-lg overflow-hidden dark:divide-slate-700 dark:border-slate-700">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => (isSelectMode ? onToggleSelected(item.id) : onOpenItem(item))}
              className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:justify-between p-3 sm:p-4 bg-white hover:bg-bg-gray/40 text-left transition-colors dark:bg-slate-800 dark:hover:bg-slate-700/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleSelected(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border-gray bg-white text-accent focus:ring-accent shrink-0 dark:border-slate-700 dark:bg-slate-800"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="block font-medium text-primary truncate dark:text-slate-100">{item.name}</span>
                  <div className="flex items-center gap-1.5 mt-1 min-w-0 text-xs text-secondary dark:text-slate-400">
                    <ItemLocationTag locationIds={placementIds(item)} locationsById={locationsById} />
                    <span className="shrink-0">·</span>
                    <ItemCategoryTag categoryPath={item.sourceCategoryTitle} />
                  </div>
                  {item.description && (
                    <p className="text-xs text-secondary truncate mt-1 dark:text-slate-400">{item.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm text-secondary dark:text-slate-400">
                <span className="sm:w-20 sm:text-right">{formatItemQuantity(item)}</span>
                <ItemStatusBadges item={item} className="sm:w-40" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className={EMPTY_BOX}>
          <Box className="w-12 h-12 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
          <p className="text-base font-medium text-primary dark:text-slate-100">{emptyText}</p>
          <p className="text-xs text-secondary mt-1 max-w-sm dark:text-slate-400">{t('page.canStillAdd')}</p>
        </div>
      )}
    </div>
  )
}
