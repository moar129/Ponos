import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readableError } from '../../ErrorMessage';
import { useGetCategoryTreeQuery, useReserveItemUnitsMutation } from '../../store/apis/categoryApi';
import { searchItemsGlobal } from '../../store/slices/dataLayersSlices/aggregatedItems';
import { ItemStatusBadges } from '../dataLayer/itemStatusBadgesComponent';
import type { AggregatedItem } from '../../types/dataLayer/datalayerTypes';

// Enten `taskId` (opgaven findes allerede - reservér med det samme via RPC,
// brugt på et eksisterende opgavekort) eller `onStage` (opgaven findes ikke
// endnu, fx under oprettelse - vælg lokalt, den kaldende komponent reserverer
// først når opgaven er oprettet).
type TaskItemPickerProps =
  | { taskId: string; onStage?: never }
  | { taskId?: never; onStage: (item: AggregatedItem, quantity: number) => void };

// US-42/US-43: vælg et Datalager-item + mængde til en opgave. Genbruger
// samme søge-hjælper som den globale søgning (searchItemsGlobal) og
// statusbadge-komponenten fra Datalager i stedet for at bygge item-søgning
// forfra.
export function TaskItemPicker({ taskId, onStage }: TaskItemPickerProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const { data: categoryTree = [] } = useGetCategoryTreeQuery();
  const [reserveItemUnits, { isLoading, error }] = useReserveItemUnitsMutation();

  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AggregatedItem | null>(null);
  const [quantity, setQuantity] = useState<number | ''>('');

  const matches = selectedItem ? [] : searchItemsGlobal(categoryTree, query);
  const available = selectedItem ? (selectedItem.statusCounts.Available ?? 0) : 0;
  const quantityInvalid = quantity === '' || quantity <= 0 || quantity > available;

  const reset = () => {
    setQuery('');
    setSelectedItem(null);
    setQuantity('');
  };

  const handleConfirm = async () => {
    if (!selectedItem || quantityInvalid) return;

    if (onStage) {
      onStage(selectedItem, Number(quantity));
      reset();
      return;
    }

    try {
      await reserveItemUnits({ taskId, itemId: selectedItem.id, quantity: Number(quantity) }).unwrap();
      reset();
    } catch {
      // Fejlen vises gennem error
    }
  };

  const errorMessage = readableError(error);

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border-gray p-3 dark:border-slate-700">
      {errorMessage && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {!selectedItem ? (
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('materials.searchPlaceholder')}
            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          {query.trim() && (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="px-1 py-2 text-sm text-secondary dark:text-slate-400">
                  {t('materials.noResults', { query })}
                </p>
              ) : (
                matches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      setQuantity('');
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border-gray px-3 py-2 text-left text-sm hover:border-secondary hover:bg-bg-gray dark:border-slate-700 dark:hover:bg-slate-700"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-primary dark:text-slate-100">{item.name}</span>
                      <span className="block truncate text-xs text-secondary dark:text-slate-400">{item.sourceCategoryTitle}</span>
                    </span>

                    <ItemStatusBadges item={item} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate font-medium text-primary dark:text-slate-100">{selectedItem.name}</span>
              <span className="block truncate text-xs text-secondary dark:text-slate-400">{selectedItem.sourceCategoryTitle}</span>
            </span>

            <ItemStatusBadges item={selectedItem} />
          </div>

          <label htmlFor="task-material-quantity" className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400">
            {t('materials.quantityLabel')}
          </label>

          <input
            id="task-material-quantity"
            type="number"
            min={1}
            max={available}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-lg border border-border-gray bg-white text-primary px-3 py-2 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          {quantity !== '' && quantity > available && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {t('materials.insufficientAvailable', { available })}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || quantityInvalid}
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {onStage ? t('materials.addItem') : isLoading ? t('materials.reserving') : t('materials.reserve')}
            </button>

            <button
              type="button"
              onClick={reset}
              disabled={isLoading}
              className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-border-gray transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
            >
              {t('common:cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
