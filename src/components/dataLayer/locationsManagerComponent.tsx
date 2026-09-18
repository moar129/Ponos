import { useState } from 'react';
import { X, Pencil, Trash2, Loader2, Save, MapPin, Plus } from 'lucide-react';
import {
  useGetItemLocationsQuery,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  useAddLocationMutation,
} from '../../store/apis/categoryApi';
import { ConfirmDialogComponent } from './confirmDialogComponent';
import type { ItemLocation, LocationManagerComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';


export function LocationManagerComponent({ isOpen, onClose, onViewItems, canCreate, canUpdate, canDelete }: LocationManagerComponentProps & {
  onViewItems?: (location: ItemLocation) => void;
}) {
  const { data: locations = [], isLoading } = useGetItemLocationsQuery();
  const [editTarget, setEditTarget] = useState<ItemLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemLocation | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [updateLocation, { isLoading: isSaving }] = useUpdateLocationMutation();
  const [deleteLocation, { isLoading: isDeleting }] = useDeleteLocationMutation();
  const [addLocation, { isLoading: isAdding }] = useAddLocationMutation();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('Navn er påkrævet.');
      return;
    }
    try {
      await addLocation({ name: newName.trim(), address: newAddress.trim() || null, description: newDescription.trim() || null }).unwrap();
      setIsCreating(false);
      setNewName('');
      setNewAddress('');
      setNewDescription('');
      setCreateError(null);
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Kunne ikke oprette lokation.'));
    }
  };

  const startEdit = (loc: ItemLocation) => {
    setEditTarget(loc);
    setEditName(loc.name);
    setEditAddress(loc.address ?? '');
    setEditDescription(loc.description ?? '');
    setFormError(null);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    if (!editName.trim()) {
      setFormError('Navn er påkrævet.');
      return;
    }
    try {
      await updateLocation({
        id: editTarget.id,
        name: editName.trim(),
        address: editAddress.trim() || null,
        description: editDescription.trim() || null,
      }).unwrap();
      setEditTarget(null);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Kunne ikke gemme ændringer.'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLocation({ id: deleteTarget.id }).unwrap();
      setDeleteTarget(null);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Kunne ikke slette lokationen.'));
      setDeleteTarget(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary dark:text-slate-100">Administrer lokationer</h2>
          <div className="flex items-center gap-1">
            {canCreate && !isCreating && (
              <button
                type="button"
                onClick={() => { setIsCreating(true); setCreateError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Ny lokation
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {formError}
            </div>
          )}

          {isCreating && (
            <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg space-y-2 dark:bg-slate-800/40 dark:border-slate-700">
              {createError && <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>}
              <input
                type="text"
                placeholder="Navn på ny lokation *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Adresse (valgfrit)"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Beskrivelse (valgfrit)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setCreateError(null); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Annullér
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isAdding}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-60"
                >
                  {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Opret
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-secondary text-center py-8 dark:text-slate-400">Ingen lokationer oprettet endnu.</p>
          ) : (
           locations.map((loc) => (
              <div key={loc.id} className="bg-bg-gray/40 border border-border-gray rounded-lg overflow-hidden dark:bg-slate-800/40 dark:border-slate-700">
                {editTarget?.id === loc.id ? (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Navn"
                      className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Adresse"
                      className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Beskrivelse"
                      className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setEditTarget(null)} className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
                        Annullér
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-60"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Gem
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={onViewItems ? () => onViewItems(loc) : undefined}
                    className={`w-full flex items-center justify-between gap-3 text-left p-3 transition-colors ${
                      onViewItems ? 'hover:bg-bg-gray/60 dark:hover:bg-slate-700/60 cursor-pointer' : ''
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-secondary shrink-0 dark:text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-sm text-primary truncate dark:text-slate-100">{loc.name}</p>
                        {loc.address && <p className="text-xs text-secondary truncate dark:text-slate-400">{loc.address}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEdit(loc); }}
                          className="p-1.5 rounded hover:bg-border-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                          title="Rediger"
                          aria-label="Rediger lokation"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(loc); }}
                          className="p-1.5 rounded hover:bg-red-50 text-secondary hover:text-red-600 dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-red-400"
                          title="Slet"
                          aria-label="Slet lokation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialogComponent
        isOpen={!!deleteTarget}
        title="Slet lokation?"
        message={`Er du sikker på, at du vil slette "${deleteTarget?.name}"? Items der bruger denne lokation mister deres lokationstilknytning (bliver ikke slettet).`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}