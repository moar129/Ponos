// components/dataLayer/locationPickerComponent.tsx
import { useState } from 'react';
import { MapPin, Settings2, Loader2 } from 'lucide-react';
import { useGetItemLocationsQuery, useAddLocationMutation } from '../../store/apis/categoryApi';
import { LocationManagerComponent } from './locationsManagerComponent';
import type { LocationPickerComponentProps } from '../../types/dataLayer/datalayerTypes';


export function LocationPickerComponent({ value, onChange }: LocationPickerComponentProps) {
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
    } catch {
      setCreateError('Kunne ikke oprette lokation.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-slate-400 uppercase tracking-wide">Lokation</label>
        <button
          type="button"
          onClick={() => setIsManaging(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#C7975D]"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Administrer
        </button>
      </div>

      {isCreating ? (
        <div className="p-3 bg-slate-950 border border-slate-700 rounded-lg space-y-2">
          {createError && <p className="text-xs text-red-400">{createError}</p>}
          <input
            type="text"
            placeholder="Navn på ny lokation *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
          />
          <input
            type="text"
            placeholder="Adresse (valgfrit)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
          />
           <input
              type="text"
              placeholder="Beskrivelse (valgfrit)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D]"
            />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsCreating(false); setCreateError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
            >
              Annullér
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-xs font-medium disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Opret &amp; vælg
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={value ?? ''}
            onChange={(e) => handleSelectChange(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#C7975D] appearance-none"
          >
            <option value="">Ingen lokation</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
            <option value="__new__">+ Opret ny lokation…</option>
          </select>
        </div>
      )}

      <LocationManagerComponent isOpen={isManaging} onClose={() => setIsManaging(false)} />
    </div>
  );
}