import { useState } from 'react';
import { useTranslation } from 'react-i18next'
import { useDeleteLocationMutation } from '../../../store/apis/categoryApi';
import { ConfirmDialogComponent } from '../confirmDialogComponent';
import type { ItemLocation } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';

interface DeleteLocationComponentProps {
  isOpen: boolean;
  location: ItemLocation | null;
  /** Antal sektioner under et lager, bruges kun til advarslen når locationen er et lager. */
  sectionCount?: number;
  onClose: () => void;
  onDeleted: (deletedId: string) => void;
}

// Selvstændig "slet lager/sektion"-bekræftelse, 1:1 med mønstret fra
// DeleteCategoryComponent - genbruger ConfirmDialogComponent.
export function DeleteLocationComponent({ isOpen, location, sectionCount = 0, onClose, onDeleted }: DeleteLocationComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [error, setError] = useState<string | null>(null);
  const [deleteLocation, { isLoading }] = useDeleteLocationMutation();

  if (!isOpen || !location) return null;

  const isSection = !!location.parentLocationId;

  async function handleConfirm() {
    if (!location) return;
    try {
      setError(null);
      await deleteLocation({ id: location.id }).unwrap();
      onDeleted(location.id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, t('locations.deleteFailed')));
    }
  }

  const message =
    sectionCount > 0
      ? t('locations.deleteMessageWithSections', { name: location.name, count: sectionCount })
      : isSection
        ? t('locations.deleteSectionMessage', { name: location.name })
        : t('locations.deleteMessage', { name: location.name });

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm shadow-lg dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <ConfirmDialogComponent
        isOpen={isOpen}
        title={isSection ? t('locations.deleteSectionTitle') : t('locations.deleteTitle')}
        message={message}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={onClose}
      />
    </>
  );
}