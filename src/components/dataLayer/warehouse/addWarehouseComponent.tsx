import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { X, Loader2, Plus } from 'lucide-react';
import { useAddLocationMutation } from '../../../store/apis/categoryApi';
import { getErrorMessage } from '../../../ErrorMessage';

interface AddLocationComponentProps {
  isOpen: boolean;
  onClose: () => void;
  /** Warehouse id when creating a section, null when creating a new warehouse. */
  parentId: string | null;
  /** Name of the parent warehouse, shown as context when creating a section. */
  parentName?: string;
  onSuccess: (newLocationId: string) => void;
}

// Selvstændig "opret lager/sektion"-modal, 1:1 med mønstret fra
// AddCategoryComponent: egen state, egen mutation, kaldes udefra med
// isOpen/onClose/onSuccess.
export function AddLocationComponent({ isOpen, onClose, parentId, parentName, onSuccess }: AddLocationComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addLocation, { isLoading }] = useAddLocationMutation();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAddress('');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSection = !!parentId;

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t('locations.nameRequired'));
      return;
    }
    try {
      const id = await addLocation({
        name: name.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        parentLocationId: parentId,
      }).unwrap();
      onSuccess(id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, t('locations.createFailed')));
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
            {isSection ? t('locations.newSectionHeading') : t('locations.newWarehouseHeading')}
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
          {isSection && parentName && (
            <p className="text-xs text-secondary dark:text-slate-400">
              {t('locations.creatingSectionHint')} <span className="font-medium text-primary dark:text-slate-100">{parentName}</span>
            </p>
          )}

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <input
            type="text"
            autoFocus
            placeholder={isSection ? t('locations.sectionNamePlaceholder') : t('locations.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder={t('locations.addressOptional')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder={t('locations.descriptionOptional')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {t('common:create')}
          </button>
        </div>
      </div>
    </div>
  );
}