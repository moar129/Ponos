import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../i18n/config'
import { X, Package, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { useUpdateItemMutation, useDeleteItemMutation, useGetItemLocationsQuery } from '../../store/apis/categoryApi';
import { LocationPickerComponent } from './locationsPickerComponent';
import { ConfirmDialogComponent } from './confirmDialogComponent';
import type { ItemDetailComponentProps, ItemLocation } from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES, ITEM_STATUS_STYLES } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';


export function ItemDetailComponent({ item, onClose, onViewLocation, canCreate, canUpdate, canDelete }: ItemDetailComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [itemStatus, setItemStatus] = useState<(typeof ALL_ITEM_STATUSES)[number]>('Available');
  const [itemLocationId, setItemLocationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<'close' | 'cancel' | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [updateItem, { isLoading }] = useUpdateItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteItemMutation();
  const { data: locations = [] } = useGetItemLocationsQuery();

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description ?? '');
      setQuantity(item.quantity);
      setItemStatus(item.itemStatus);
      setItemLocationId(item.itemLocationId ?? null);
      setIsEditing(false);
      setFormError(null);
      setPendingDiscardAction(null);
      setIsConfirmingDelete(false);
      setDeleteError(null);
    }
  }, [item]);

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  function locationPathLabel(location: ItemLocation, allLocations: ItemLocation[]): string {
    if (!location.parentLocationId) return location.name;
    const parent = allLocations.find((l) => l.id === location.parentLocationId);
    return parent ? `${parent.name} > ${location.name}` : location.name;
  }

  const hasUnsavedChanges =
    !!item &&
    (name !== item.name ||
      description !== (item.description ?? '') ||
      quantity !== item.quantity ||
      itemStatus !== item.itemStatus ||
      itemLocationId !== (item.itemLocationId ?? null));

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, isEditing, hasUnsavedChanges]);

  if (!item) return null;

  const currentLocation = locations.find((l) => l.id === item.itemLocationId);

  const requestClose = () => {
    if (isEditing && hasUnsavedChanges) {
      setPendingDiscardAction('close');
      return;
    }
    setIsEditing(false);
    onClose();
  };

  const requestCancelEdit = () => {
    if (hasUnsavedChanges) {
      setPendingDiscardAction('cancel');
      return;
    }
    setIsEditing(false);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError(t('itemDetail.nameRequired'));
      return;
    }

    try {
      await updateItem({
        id: item.id,
        name: name.trim(),
        description: description.trim() || null,
        quantity,
        itemStatus,
        itemLocationId,
      }).unwrap();

      setIsEditing(false);
      onClose(); // luk modalen, så listen viser opdaterede data
    } catch (err) {
      setFormError(getErrorMessage(err, t('itemDetail.saveFailed')));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem({ id: item.id }).unwrap();
      setIsConfirmingDelete(false);
      onClose();
    } catch (err) {
      setDeleteError(getErrorMessage(err, t('itemDetail.deleteFailed')));
    }
  };

  const handleEnterSaves = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={requestClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-md dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-5 h-5 text-accent shrink-0" />
            <div className="min-w-0">
              {isEditing ? (
                <h2 className="text-lg font-semibold text-primary truncate dark:text-slate-100">{t('itemDetail.heading')}</h2>
              ) : (
                <h2 className="text-lg font-semibold text-primary truncate dark:text-slate-100">{item.name}</h2>
              )}
              {!isEditing && (() => {
                const parts = item.sourceCategoryTitle.split(' > ');
                const current = parts[parts.length - 1];
                const ancestors = parts.slice(0, -1);
                return (
                  <p className="text-xs text-secondary truncate dark:text-slate-400">
                    {t('itemDetail.inCategory')} {ancestors.length > 0 && `${ancestors.join(' > ')} > `}
                    <strong className="text-primary font-medium dark:text-slate-100">{current}</strong>
                  </p>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && canUpdate && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                title={t('itemDetail.editItem')}
                aria-label={t('itemDetail.editItem')}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {!isEditing && canDelete && (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 rounded-md hover:bg-red-50 text-secondary hover:text-red-600 dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-red-400"
                title={t('itemDetail.deleteItem')}
                aria-label={t('itemDetail.deleteItem')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={requestClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100" title={t('close')} aria-label={t('closeModal')}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

          {isEditing && (
            <div>
              <label htmlFor="item-name-input" className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">
                {t('fields.nameRequired')} <span aria-hidden="true" className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="item-name-input"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleEnterSaves}
                className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.status')}</span>
              {isEditing ? (
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value as (typeof ALL_ITEM_STATUSES)[number])}
                  className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                </select>
              ) : (
                <span className={`inline-block px-2 py-0.5 rounded border text-sm ${ITEM_STATUS_STYLES[item.itemStatus] ?? 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700'}`}>
                  {td(`datalayer:status.${item.itemStatus}`)}
                </span>
              )}
            </div>
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.quantity')}</span>
              {isEditing ? (
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                  onKeyDown={handleEnterSaves}
                  className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              ) : (
                <span className="text-primary dark:text-slate-100">{item.quantity}</span>
              )}
            </div>

           <div className="col-span-2">
              {!isEditing && (
                <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.location')}</span>
              )}
              {isEditing ? (
                <LocationPickerComponent
                  value={itemLocationId}
                  onChange={setItemLocationId}
                  canCreate={canCreate}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              ) : currentLocation ? (
                <button
                  type="button"
                  onClick={() => onViewLocation(currentLocation)}
                  className="text-primary hover:text-accent hover:underline underline-offset-2 text-left dark:text-slate-100"
                  title={t('itemDetail.showItemsAtLocation')}
                >
                  {locationPathLabel(currentLocation, locations)}
                </button>
              ) : (
                <span className="text-secondary dark:text-slate-400">{t('itemDetail.noLocation')}</span>
              )}
            </div>
          </div>
          <div>
            <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.description')}</span>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('addItems.descriptionPlaceholder')}
                rows={3}
                className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            ) : (
              <p className="text-sm text-secondary dark:text-slate-400">{item.description || t('itemDetail.noDescription')}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray dark:border-slate-700">
            <button
              type="button"
              onClick={requestCancelEdit}
              className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common:save')}
            </button>
          </div>
        )}
      </div>
    </div>

    <ConfirmDialogComponent
      isOpen={pendingDiscardAction !== null}
      title={t('itemDetail.discardTitle')}
      message={t('itemDetail.discardMessage')}
      confirmLabel={t('itemDetail.discardConfirm')}
      onConfirm={() => {
        const action = pendingDiscardAction;
        setPendingDiscardAction(null);
        setIsEditing(false);
        setFormError(null);
        if (action === 'close') onClose();
      }}
      onCancel={() => setPendingDiscardAction(null)}
    />

    <ConfirmDialogComponent
      isOpen={isConfirmingDelete}
      title={t('itemDetail.deleteTitle')}
      message={`${t('itemDetail.deleteMessage', { name: item.name })}${deleteError ? ` ${deleteError}` : ''}`}
      confirmLabel={t('itemDetail.deleteConfirm')}
      isLoading={isDeleting}
      onConfirm={handleDelete}
      onCancel={() => { setIsConfirmingDelete(false); setDeleteError(null); }}
    />
    </>
  );
}
