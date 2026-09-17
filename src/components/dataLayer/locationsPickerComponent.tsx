import { useState } from 'react';
import { MapPin, Settings2, Loader2, ChevronDown } from 'lucide-react';
import { useGetItemLocationsQuery, useAddLocationMutation } from '../../store/apis/categoryApi';
import { LocationManagerComponent } from './locationsManagerComponent';
import type { LocationPickerComponentProps } from '../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../ErrorMessage';


export function LocationPickerComponent({ value, onChange, canCreate, canUpdate, canDelete }: LocationPickerComponentProps) {
  const { data: locations = [], isLoading } = useGetItemLocationsQuery();
  const [isCreating, setIsCreating] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [addLocation, { isLoading: isSaving }] = useAddLocationMutation();

  const handleSelectChange = (val: string) => {
    if (val === '__new__') {
      setIsCreating(true);
      return;
    }
    onChange(val === '' ? null : val);
  };
 
  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError('Navn er påkrævet.');
      return;
    }
    try {
      const id = await addLocation({ name: newName.trim(), address: newAddress.trim() || null, description: newDescription.trim() || null }).unwrap();
      onChange(id);
      setIsCreating(false);
      setNewName('');
      setNewAddress('');
      setNewDescription('');
      setCreateError(null);
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Kunne ikke oprette lokation.'));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-secondary uppercase tracking-wide dark:text-slate-400">Lokation</label>
        {(canUpdate || canDelete) && (
          <button
            type="button"
            onClick={() => setIsManaging(true)}
            className="flex items-center gap-1 text-xs text-secondary hover:text-accent dark:text-slate-400"
            title="Administrer lokationer"
            aria-label="Administrer lokationer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Administrer lokationer
          </button>
        )}
      </div>

      {isCreating ? (
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
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Opret &amp; vælg
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
          <select
            value={value ?? ''}
            onChange={(e) => handleSelectChange(e.target.value)}
            disabled={isLoading}
            className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-8 py-2 text-sm text-primary focus:outline-none focus:border-accent appearance-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          >
            <option value="">Ingen lokation</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
            {canCreate && <option value="__new__">+ Opret ny lokation…</option>}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
        </div>
      )}

      <LocationManagerComponent
        isOpen={isManaging}
        onClose={() => setIsManaging(false)}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}