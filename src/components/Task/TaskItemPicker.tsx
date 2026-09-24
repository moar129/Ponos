import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readableError } from '../../ErrorMessage';
import {
  useGetCategoryTreeQuery,
  useGetAvailableUnitLocationsQuery,
  useGetItemLocationsQuery,
  useReserveItemUnitsMutation,
} from '../../store/apis/categoryApi';
import { searchItemsGlobal } from '../../store/slices/dataLayersSlices/aggregatedItems';
import { ItemStatusBadges } from '../dataLayer/itemStatusBadgesComponent';
import { locationPathLabel } from '../../utils/locationPathLabel';
import type { AggregatedItem } from '../../types/dataLayer/datalayerTypes';
import type { StagedLocation } from '../../types/Task/Task';

// Enten `taskId` (opgaven findes allerede - reservér med det samme via RPC,
// brugt på et eksisterende opgavekort) eller `onStage` (opgaven findes ikke
// endnu, fx under oprettelse - vælg lokalt, den kaldende komponent reserverer
// først når opgaven er oprettet).
type TaskItemPickerProps =
  | { taskId: string; onStage?: never }
  | { taskId?: never; onStage: (item: AggregatedItem, quantity: number, location: StagedLocation) => void };

interface LocationOption extends StagedLocation {
  available: number;
}

// US-42/US-43: vælg et Datalager-item + lager + mængde til en opgave.
// Genbruger samme søge-hjælper som den globale søgning (searchItemsGlobal)
// og statusbadge-komponenten fra Datalager i stedet for at bygge item-søgning
// forfra. Der reserveres kun fra det valgte lager, så opgaven ikke får
// materiale, man ikke fysisk kan få fat i.
export function TaskItemPicker({ taskId, onStage }: TaskItemPickerProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const { data: categoryTree = [] } = useGetCategoryTreeQuery();
  const [reserveItemUnits, { isLoading, error }] = useReserveItemUnitsMutation();

  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AggregatedItem | null>(null);
  const [chosenLocation, setChosenLocation] = useState<StagedLocation | null>(null);
  const [quantity, setQuantity] = useState<number | ''>('');

  const { data: availableLocations = [], isLoading: availableLoading } = useGetAvailableUnitLocationsQuery();
  const { data: locations = [] } = useGetItemLocationsQuery();

  // Ledig mængde pr. lager for ét item (id null = enheder uden lager),
  // største mængde først.
  const locationOptionsFor = (itemId: string): LocationOption[] =>
    availableLocations
      .filter((row) => row.itemId === itemId && row.quantity > 0)
      .map((row) => {
        const location = row.locationId ? locations.find((l) => l.id === row.locationId) : undefined;
        return {
          id: row.locationId,
          label: location ? locationPathLabel(location, locations) : t('materials.noLocation'),
          available: row.quantity,
        };
      })
      .sort((a, b) => b.available - a.available);

  const locationOptions = selectedItem ? locationOptionsFor(selectedItem.id) : [];

  // Kun ét lager med ledigt materiale - vælg det automatisk.
  const selectedLocation = chosenLocation ?? (locationOptions.length === 1 ? locationOptions[0] : null);
  const available = selectedLocation
    ? (locationOptions.find((o) => o.id === selectedLocation.id)?.available ?? 0)
    : 0;

  const matches = selectedItem ? [] : searchItemsGlobal(categoryTree, query);
  const quantityInvalid = !selectedLocation || quantity === '' || quantity <= 0 || quantity > available;

  const reset = () => {
    setQuery('');
    setSelectedItem(null);
    setChosenLocation(null);
    setQuantity('');
  };

  const handleConfirm = async () => {
    if (!selectedItem || !selectedLocation || quantityInvalid) return;

    const location: StagedLocation = { id: selectedLocation.id, label: selectedLocation.label };

    if (onStage) {
      onStage(selectedItem, Number(quantity), location);
      reset();
      return;
    }

    try {
      await reserveItemUnits({
        taskId,
        itemId: selectedItem.id,
        quantity: Number(quantity),
        locationId: location.id,
      }).unwrap();
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
                matches.map((item) => {
                  const itemLocations = locationOptionsFor(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setChosenLocation(null);
                        setQuantity('');
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border-gray px-3 py-2 text-left text-sm hover:border-secondary hover:bg-bg-gray dark:border-slate-700 dark:hover:bg-slate-700"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-primary dark:text-slate-100">{item.name}</span>
                        <span className="block truncate text-xs text-secondary dark:text-slate-400">{item.sourceCategoryTitle}</span>
                        {!availableLoading && (
                          <span className="block text-xs text-secondary dark:text-slate-400">
                            {itemLocations.length === 0
                              ? t('materials.noAvailableAnywhere')
                              : itemLocations
                                  .map((o) => `${o.label}: ${o.available} ${item.unitOfMeasurement}`)
                                  .join(' · ')}
                          </span>
                        )}
                      </span>

                      <ItemStatusBadges item={item} />
                    </button>
                  );
                })
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

          <span className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400">
            {t('materials.locationLabel')}
          </span>

          {availableLoading ? (
            <p className="mb-3 text-xs text-secondary dark:text-slate-400">{t('common:loading')}</p>
          ) : locationOptions.length === 0 ? (
            <p className="mb-3 text-xs text-red-600 dark:text-red-400">{t('materials.noAvailableAnywhere')}</p>
          ) : (
            <div className="mb-3 space-y-1">
              {locationOptions.map((option) => {
                const isSelected = selectedLocation?.id === option.id;

                return (
                  <button
                    key={option.id ?? 'none'}
                    type="button"
                    onClick={() => {
                      setChosenLocation({ id: option.id, label: option.label });
                      setQuantity('');
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-primary dark:text-slate-100'
                        : 'border-border-gray text-primary hover:bg-bg-gray dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    <span className="shrink-0 text-xs text-secondary dark:text-slate-400">
                      {t('materials.availableAtLocation', { amount: option.available, unit: selectedItem.unitOfMeasurement })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <label htmlFor="task-material-quantity" className="mb-1 block text-sm font-medium text-secondary dark:text-slate-400">
            {t('materials.quantityLabel')}
          </label>

          <input
            id="task-material-quantity"
            type="number"
            min={1}
            max={available}
            disabled={!selectedLocation}
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
