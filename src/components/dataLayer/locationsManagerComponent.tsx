import { useState } from 'react';
import { X, Pencil, Trash2, Loader2, Save, MapPin, Plus, Boxes } from 'lucide-react';
import {
  useGetItemLocationsQuery,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  useAddLocationMutation,
} from '../../store/apis/categoryApi';
import { ConfirmDialogComponent } from './confirmDialogComponent';
import type { ItemLocation, LocationManagerComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';

// US-S1: en lokation kan enten være et LAGER (parentLocationId = null) eller
// en SEKTION på et lager (parentLocationId peger på lagerets id). Kun ét
// niveau understøttes - en sektion kan ikke selv have underlokationer
// (håndhævet server-side af trg_validate_location_parent).
export function LocationManagerComponent({ isOpen, onClose, onViewItems, canCreate, canUpdate, canDelete }: LocationManagerComponentProps & {
  onViewItems?: (location: ItemLocation) => void;
}) {
  const { data: locations = [], isLoading } = useGetItemLocationsQuery();
  const [editTarget, setEditTarget] = useState<ItemLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemLocation | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');
  // null = opretter et lager, ellers id på det lager sektionen hører til
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [updateLocation, { isLoading: isSaving }] = useUpdateLocationMutation();
  const [deleteLocation, { isLoading: isDeleting }] = useDeleteLocationMutation();
  const [addLocation, { isLoading: isAdding }] = useAddLocationMutation();

  if (!isOpen) return null;

  // Kun rigtige lagre kan vælges som "forælder" til en sektion - en sektion
  // kan ikke selv have en sektion under sig.
  const warehouses = locations.filter((l) => !l.parentLocationId);

  // Grupperer sektioner ind under deres lager, så listen kan vises
  // hierarkisk i stedet for fladt.
  const grouped = warehouses.map((warehouse) => ({
    warehouse,
    sections: locations.filter((l) => l.parentLocationId === warehouse.id),
  }));

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('Navn er påkrævet.');
      return;
    }
    try {
      await addLocation({
        name: newName.trim(),
        address: newAddress.trim() || null,
        description: newDescription.trim() || null,
        parentLocationId: newParentId,
      }).unwrap();
      setIsCreating(false);
      setNewName('');
      setNewAddress('');
      setNewDescription('');
      setNewParentId(null);
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
    setEditParentId(loc.parentLocationId ?? null);
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
        ...(editParentId !== null ? { parentLocationId: editParentId } : {}),
      } as any).unwrap();
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

  // Sletter man et lager, slettes dets sektioner automatisk med (ON DELETE
  // CASCADE) - beskeden gøres derfor tydeligere for lagre med sektioner.
  const deleteTargetSectionCount = deleteTarget && !deleteTarget.parentLocationId
    ? locations.filter((l) => l.parentLocationId === deleteTarget.id).length
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary dark:text-slate-100">Administrer lagere</h2>
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

              {/* US-S1: vælg om der oprettes et lager eller en sektion på et eksisterende lager */}
              <div>
                <label className="block text-xs text-secondary uppercase tracking-wide mb-1.5 dark:text-slate-400">Type</label>
                <div className="flex gap-4 text-sm text-primary dark:text-slate-100">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="location-kind"
                      checked={newParentId === null}
                      onChange={() => setNewParentId(null)}
                      className="text-accent focus:ring-accent"
                    />
                    Lager
                  </label>
                  <label className={`flex items-center gap-1.5 ${warehouses.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="location-kind"
                      checked={newParentId !== null}
                      onChange={() => setNewParentId(warehouses[0]?.id ?? null)}
                      disabled={warehouses.length === 0}
                      className="text-accent focus:ring-accent"
                    />
                    Sektion på et lager
                  </label>
                </div>
              </div>

              {newParentId !== null && (
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder={newParentId === null ? 'Navn på nyt lager *' : 'Navn på ny sektion *'}
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
                  onClick={() => { setIsCreating(false); setCreateError(null); setNewParentId(null); }}
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
            grouped.map(({ warehouse, sections }) => (
              <div key={warehouse.id} className="space-y-1.5">
                <LocationRow
                  loc={warehouse}
                  onViewItems={onViewItems}
                  onEdit={() => startEdit(warehouse)}
                  onDelete={() => setDeleteTarget(warehouse)}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  isEditing={editTarget?.id === warehouse.id}
                  editName={editName}
                  editAddress={editAddress}
                  editDescription={editDescription}
                  editParentId={editParentId}
                  warehouses={warehouses}
                  setEditName={setEditName}
                  setEditAddress={setEditAddress}
                  setEditDescription={setEditDescription}
                  setEditParentId={setEditParentId}
                  onCancelEdit={() => setEditTarget(null)}
                  onSaveEdit={handleSave}
                  isSaving={isSaving}
                />

                {sections.length > 0 && (
                  <div className="pl-6 space-y-1.5 border-l-2 border-border-gray dark:border-slate-700 ml-3">
                    {sections.map((section) => (
                      <LocationRow
                        key={section.id}
                        loc={section}
                        isSection
                        onViewItems={onViewItems}
                        onEdit={() => startEdit(section)}
                        onDelete={() => setDeleteTarget(section)}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        isEditing={editTarget?.id === section.id}
                        editName={editName}
                        editAddress={editAddress}
                        editDescription={editDescription}
                        editParentId={editParentId}
                        warehouses={warehouses}
                        setEditName={setEditName}
                        setEditAddress={setEditAddress}
                        setEditDescription={setEditDescription}
                        setEditParentId={setEditParentId}
                        onCancelEdit={() => setEditTarget(null)}
                        onSaveEdit={handleSave}
                        isSaving={isSaving}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialogComponent
        isOpen={!!deleteTarget}
        title={deleteTarget?.parentLocationId ? 'Slet sektion?' : 'Slet lager?'}
        message={
          deleteTargetSectionCount > 0
            ? `Er du sikker på, at du vil slette "${deleteTarget?.name}"? De ${deleteTargetSectionCount} sektion(er) på lageret slettes også. Items der bruger disse lokationer mister deres lokationstilknytning (bliver ikke slettet).`
            : `Er du sikker på, at du vil slette "${deleteTarget?.name}"? Items der bruger denne lokation mister deres lokationstilknytning (bliver ikke slettet).`
        }
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// Én lokations-række (lager eller sektion), enten i visnings- eller
// redigerings-tilstand. Udtrukket som egen komponent, så lager- og
// sektions-rækker deler præcis samme redigerings-logik.
function LocationRow({
  loc,
  isSection = false,
  onViewItems,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  isEditing,
  editName,
  editAddress,
  editDescription,
  editParentId,
  warehouses,
  setEditName,
  setEditAddress,
  setEditDescription,
  setEditParentId,
  onCancelEdit,
  onSaveEdit,
  isSaving,
}: {
  loc: ItemLocation;
  isSection?: boolean;
  onViewItems?: (location: ItemLocation) => void;
  onEdit: () => void;
  onDelete: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  isEditing: boolean;
  editName: string;
  editAddress: string;
  editDescription: string;
  editParentId: string | null;
  warehouses: ItemLocation[];
  setEditName: (v: string) => void;
  setEditAddress: (v: string) => void;
  setEditDescription: (v: string) => void;
  setEditParentId: (v: string | null) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="bg-bg-gray/40 border border-border-gray rounded-lg overflow-hidden dark:bg-slate-800/40 dark:border-slate-700">
      {isEditing ? (
        <div className="p-3 space-y-2">
          {/* En sektion kan flyttes til et andet lager; et lager kan ikke
              gøres til en sektion herfra - det ville kræve at flytte alle
              dets egne sektioner med, så det er bevidst ikke muligt. */}
          {isSection && (
            <select
              value={editParentId ?? ''}
              onChange={(e) => setEditParentId(e.target.value)}
              className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
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
            <button type="button" onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700">
              Annullér
            </button>
            <button
              type="button"
              onClick={onSaveEdit}
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
            {isSection ? (
              <Boxes className="w-4 h-4 text-secondary shrink-0 dark:text-slate-400" />
            ) : (
              <MapPin className="w-4 h-4 text-secondary shrink-0 dark:text-slate-400" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-primary truncate dark:text-slate-100">{loc.name}</p>
              {loc.address && <p className="text-xs text-secondary truncate dark:text-slate-400">{loc.address}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canUpdate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
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
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
  );
}