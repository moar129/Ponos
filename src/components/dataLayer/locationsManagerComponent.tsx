// components/dataLayer/locationManagerComponent.tsx
import { useState } from 'react';
import { X, Pencil, Trash2, Loader2, Save, MapPin } from 'lucide-react';
import {
  useGetItemLocationsQuery,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} from '../../store/apis/categoryApi';
import { ConfirmDialogComponent } from './confirmDialogComponent';
import type { ItemLocation, LocationManagerComponentProps } from '../../types/dataLayer/datalayerTypes';


export function LocationManagerComponent({ isOpen, onClose, onViewItems }: LocationManagerComponentProps & {
  onViewItems?: (location: ItemLocation) => void;
}) {
  const { data: locations = [], isLoading } = useGetItemLocationsQuery();
  const [editTarget, setEditTarget] = useState<ItemLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemLocation | null>(null);

  const [updateLocation, { isLoading: isSaving }] = useUpdateLocationMutation();
  const [deleteLocation, { isLoading: isDeleting }] = useDeleteLocationMutation();

  if (!isOpen) return null;

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
    } catch {
      setFormError('Kunne ikke gemme ændringer.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLocation({ id: deleteTarget.id }).unwrap();
      setDeleteTarget(null);
    } catch {
      setFormError('Kunne ikke slette lokationen.');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-[#0B132A] border border-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Administrer lokationer</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {formError}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Ingen lokationer oprettet endnu.</p>
          ) : (
           locations.map((loc) => (
              <div key={loc.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {editTarget?.id === loc.id ? (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Navn"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
                    />
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Adresse"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Beskrivelse"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setEditTarget(null)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800">
                        Annullér
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-xs font-medium disabled:opacity-60"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Gem
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onViewItems?.(loc)}
                    className="w-full flex items-center justify-between gap-3 text-left p-3 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">{loc.name}</p>
                        {loc.address && <p className="text-xs text-slate-500 truncate">{loc.address}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); startEdit(loc); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); startEdit(loc); } }}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                        title="Rediger"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(loc); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteTarget(loc); } }}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                        title="Slet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
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