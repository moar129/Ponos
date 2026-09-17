import { useState, useEffect } from 'react';
import { X, Package, Pencil, Loader2, Save } from 'lucide-react';
import { useUpdateItemMutation, useGetItemLocationsQuery } from '../../store/apis/categoryApi';
import { LocationPickerComponent } from './locationsPickerComponent';
import type { AggregatedItem } from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES, ITEM_STATUS_STYLES } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';

interface ItemDetailComponentProps {
  item: AggregatedItem | null;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}


export function ItemDetailComponent({ item, onClose, canCreate, canUpdate, canDelete }: ItemDetailComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [itemStatus, setItemStatus] = useState<(typeof ALL_ITEM_STATUSES)[number]>('Available');
  const [itemLocationId, setItemLocationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [updateItem, { isLoading }] = useUpdateItemMutation();
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
    }
  }, [item]);

  if (!item) return null;

  const currentLocationName = locations.find((l) => l.id === item.itemLocationId)?.name;

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Navn er påkrævet.');
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

      handleClose(); // luk modalen, så listen viser opdaterede data
    } catch (err) {
      setFormError(getErrorMessage(err, 'Kunne ikke gemme ændringer. Prøv igen.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-5 h-5 text-accent shrink-0" />
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border border-border-gray rounded-lg px-2 py-1 text-sm text-primary focus:outline-none focus:border-accent"
              />
            ) : (
              <h2 className="text-lg font-semibold text-primary truncate">{item.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isEditing && canUpdate && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary"
                title="Rediger item"
                aria-label="Rediger item"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={handleClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary" title="Luk" aria-label="Luk modal">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {formError}
            </div>
          )}

          {isEditing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskrivelse"
              rows={3}
              className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
            />
          ) : (
            <p className="text-sm text-secondary">{item.description || 'Ingen beskrivelse'}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1">Antal</span>
              {isEditing ? (
                <input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent"
                />
              ) : (
                <span className="text-primary">{item.quantity}</span>
              )}
            </div>
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1">Status</span>
              {isEditing ? (
                <select
                  value={itemStatus}
                  onChange={(e) => setItemStatus(e.target.value as (typeof ALL_ITEM_STATUSES)[number])}
                  className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent"
                >
                  {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              ) : (
                <span className={`inline-block px-2 py-0.5 rounded border text-xs ${ITEM_STATUS_STYLES[item.itemStatus] ?? 'bg-bg-gray text-secondary border-border-gray'}`}>
                  {item.itemStatus}
                </span>
              )}
            </div>

            <div className="col-span-2">
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1">Lokation</span>
              {isEditing ? (
                <LocationPickerComponent
                  value={itemLocationId}
                  onChange={setItemLocationId}
                  canCreate={canCreate}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              ) : (
                <span className="text-primary">{currentLocationName ?? 'Ingen lokation'}</span>
              )}
            </div>

            {item.isFromSubCategory && !isEditing && (
              <div className="col-span-2">
                <span className="block text-xs text-secondary uppercase tracking-wide mb-1">Kategori</span>
                <span className="text-primary">{item.sourceCategoryTitle}</span>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border-gray">
            <button
              type="button"
              onClick={() => { setIsEditing(false); setFormError(null); }}
              className="px-4 py-2 rounded-lg text-sm text-secondary hover:bg-bg-gray"
            >
              Annullér
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Gem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}