import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { MapPin, Boxes, Plus, Loader2, ChevronDown } from 'lucide-react';
import { useGetItemLocationsQuery, useAddLocationMutation } from '../../../store/apis/categoryApi';
import type { LocationPickerComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';


export function LocationPickerComponent({ value, onChange, canCreate }: LocationPickerComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const { data: locations = [], isLoading } = useGetItemLocationsQuery();
  // Hvad der oprettes styres af HVILKEN "opret"-option der blev valgt, ikke
  // af om et lager tilfældigvis er valgt - ellers blev "Opret nyt lager"
  // til en sektion, så snart et lager allerede var valgt.
  const [creatingKind, setCreatingKind] = useState<'warehouse' | 'section' | null>(null);
  const isCreating = creatingKind !== null;
  const isCreatingSection = creatingKind === 'section';
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [addLocation, { isLoading: isSaving }] = useAddLocationMutation();

  const warehouses = locations.filter((l) => !l.parentLocationId);

  // Hvilket lager der er valgt i første dropdown. Udledes af den aktuelle
  // value (så et allerede valgt item's lokation vises korrekt ved åbning),
  // men kan også ændres selvstændigt uden at det med det samme rører
  // value - man kan bladre gennem lagre uden at ændre valget, før man
  // rent faktisk vælger en sektion (eller lageret selv).
  const selectedLocation = locations.find((l) => l.id === value) ?? null;
  const initialWarehouseId = selectedLocation
    ? (selectedLocation.parentLocationId ?? selectedLocation.id)
    : null;

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(initialWarehouseId);

  // Springes over lige efter vi selv har initieret et value-skift (se
  // handleCreate) - ellers overskriver denne effekt vores egen "vælg den
  // nyoprettede lokation" med null, fordi `locations` (RTK Query-cachen)
  // typisk endnu ikke er nået at blive refetchet med den nye lokation.
  // Uden guarden hænger valget permanent tilbage på tomt, da locations'
  // senere opdatering ikke selv trigger effekten igen (kun [value] gør).
  const skipNextValueSyncRef = useRef(false);

  // Følger med, hvis value ændres udefra (fx nulstilles af formularen).
  useEffect(() => {
    if (skipNextValueSyncRef.current) {
      skipNextValueSyncRef.current = false;
      return;
    }
    setSelectedWarehouseId(initialWarehouseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const sectionsInSelectedWarehouse = selectedWarehouseId
    ? locations.filter((l) => l.parentLocationId === selectedWarehouseId)
    : [];

  const handleWarehouseChange = (val: string) => {
    if (val === '') {
      setSelectedWarehouseId(null);
      onChange(null);
      return;
    }
    setSelectedWarehouseId(val);
    // Vælger lageret selv, indtil brugeren evt. specificerer en sektion -
    // et lager uden sektioner skal kunne vælges direkte.
    onChange(val);
  };

  const handleSectionChange = (val: string) => {
    if (val === '__new_section__') {
      setCreatingKind('section');
      return;
    }
    // Tom værdi = "hele lageret" (ingen bestemt sektion).
    onChange(val === '' ? selectedWarehouseId : val);
  };

  // "Opret lager" åbner altid oprettelse af et NYT lager (ikke en
  // sektion) - en tydelig knap i toppen i stedet for en gemt mulighed
  // nederst i dropdown'en.
  const openCreateWarehouse = () => {
    setSelectedWarehouseId(null);
    setNewName('');
    setNewAddress('');
    setNewDescription('');
    setCreateError(null);
    setCreatingKind('warehouse');
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError(t('locations.nameRequired'));
      return;
    }
    try {
      const id = await addLocation({
        name: newName.trim(),
        address: newAddress.trim() || null,
        description: newDescription.trim() || null,
        // Sektion under det valgte lager, eller et nyt selvstændigt lager.
        parentLocationId: isCreatingSection ? selectedWarehouseId : null,
      }).unwrap();

      skipNextValueSyncRef.current = true;

      if (isCreatingSection) {
        // Ny sektion: vælg den, og hold lageret som det er.
        onChange(id);
      } else {
        // Nyt lager: gør det til det valgte lager.
        setSelectedWarehouseId(id);
        onChange(id);
      }

      setCreatingKind(null);
      setNewName('');
      setNewAddress('');
      setNewDescription('');
      setCreateError(null);
    } catch (err) {
      setCreateError(getErrorMessage(err, t('locations.createFailed')));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs text-secondary uppercase tracking-wide dark:text-slate-400">{t('fields.location')}</label>
        {canCreate && !isCreating && (
          <button
            type="button"
            onClick={openCreateWarehouse}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('locations.createWarehouseButton')}
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="p-3 bg-bg-gray/40 border border-border-gray rounded-lg space-y-2 dark:bg-slate-800/40 dark:border-slate-700">
          {createError && <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>}
          <p className="text-xs text-secondary dark:text-slate-400">
            {isCreatingSection ? t('locations.creatingSectionHint') : t('locations.creatingWarehouseHint')}
          </p>
          <input
            type="text"
            autoFocus
            placeholder={isCreatingSection ? t('locations.sectionNamePlaceholder') : t('locations.namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder={t('locations.addressOptional')}
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder={t('locations.descriptionOptional')}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setCreatingKind(null); setCreateError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('locations.createAndSelect')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Trin 1: vælg lager */}
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
            <select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-8 py-2 text-sm text-primary focus:outline-none focus:border-accent appearance-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            >
              <option value="">{t('locations.none')}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
          </div>

          {/* Trin 2: vælg sektion på det valgte lager, hvis det har nogen -
              eller tilbyder at oprette den første. Skjules helt for et
              lager uden sektioner og uden opret-adgang, så itemet i så
              fald bare ligger direkte på lageret. */}
          {selectedWarehouseId && (sectionsInSelectedWarehouse.length > 0 || canCreate) && (
            <div className="relative">
              <Boxes className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
              <select
                value={sectionsInSelectedWarehouse.some((s) => s.id === value) ? value ?? '' : ''}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-8 py-2 text-sm text-primary focus:outline-none focus:border-accent appearance-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              >
                <option value="">{t('locations.noSectionOption')}</option>
                {sectionsInSelectedWarehouse.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                {canCreate && <option value="__new_section__">{t('locations.addNewSectionOption')}</option>}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}