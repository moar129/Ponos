import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { X, Loader2, Save } from 'lucide-react';
import { useUpdateLocationMutation } from '../../../store/apis/categoryApi';
import type { ItemLocation } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';

interface EditLocationComponentProps {
  isOpen: boolean;
  onClose: () => void;
  location: ItemLocation | null;
}

// Selvstændig "rediger lager/sektion"-modal, 1:1 med mønstret fra
// EditCategoryComponent.
export function EditLocationComponent({ isOpen, onClose, location }: EditLocationComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [updateLocation, { isLoading }] = useUpdateLocationMutation();

  useEffect(() => {
    if (isOpen && location) {
      setName(location.name);
      setAddress(location.address ?? '');
      setDescription(location.description ?? '');
      setError(null);
    }
  }, [isOpen, location]);

  if (!isOpen || !location) return null;

  const isSection = !!location.parentLocationId;

  async function handleSubmit() {
    if (!location) return;
    if (!name.trim()) {
      setError(t('locations.nameRequired'));
      return;
    }
    try {
      await updateLocation({
        id: location.id,
        name: name.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
      }).unwrap();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, t('locations.saveFailed')));
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-md dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <h2 className="text-base font-semibold text-primary dark:text-slate-100">
            {isSection ? t('locations.editSectionHeading') : t('locations.editWarehouseHeading')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('locations.namePlaceholderShort')}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('locations.addressPlaceholder')}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('locations.descriptionPlaceholder')}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-gray dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t('common:save')}
          </button>
        </div>
      </div>
    </div>
  );
}