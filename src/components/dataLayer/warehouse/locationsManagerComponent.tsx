import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { X, Loader2, Save, MapPin, Boxes, Plus, Package, Search } from 'lucide-react';
import {
  useGetItemLocationsQuery,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  useAddLocationMutation,
} from '../../../store/apis/categoryApi';
import { ConfirmDialogComponent } from '../confirmDialogComponent';
import { LocationTreeNode } from './locationThreeNodeComponent';
import { ITEM_STATUS_STYLES } from '../../../types/dataLayer/datalayerTypes';
import type { ItemLocation, LocationManagerComponentProps } from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';

// Lagre/sektioner vises nu som et træ i venstre panel - samme mønster
// som kategori-træet i DataLayerPage.tsx - i stedet for den tidligere
// drill-down-liste. Klik på et lager ELLER en sektion viser dens items
// inline i højre panel, ligesom en kategori viser sine items.
export function LocationManagerComponent({
  isOpen,
  onClose,
  canCreate,
  canUpdate,
  canDelete,
  items = [],
  onSelectItem,
}: LocationManagerComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  const { data: locations = [], isLoading } = useGetItemLocationsQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWarehouseIds, setExpandedWarehouseIds] = useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<ItemLocation | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemLocation | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [updateLocation, { isLoading: isSaving }] = useUpdateLocationMutation();
  const [deleteLocation, { isLoading: isDeleting }] = useDeleteLocationMutation();
  const [addLocation, { isLoading: isAdding }] = useAddLocationMutation();

  const warehouses = useMemo(() => locations.filter((l) => !l.parentLocationId), [locations]);
  const sectionsByWarehouseId = useMemo(() => {
    const map = new Map<string, ItemLocation[]>();
    for (const loc of locations) {
      if (!loc.parentLocationId) continue;
      const list = map.get(loc.parentLocationId) ?? [];
      list.push(loc);
      map.set(loc.parentLocationId, list);
    }
    return map;
  }, [locations]);

  const trimmedSearch = searchQuery.trim().toLowerCase();

  // US-S5-agtig søgning, men nu som et filter på TRÆET i stedet for en
  // separat flad resultatliste: et lager er synligt hvis det selv eller
  // en af dets sektioner matcher, og synlige lagre foldes automatisk ud
  // mens der søges.
  const visibleWarehouses = useMemo(() => {
    if (!trimmedSearch) return warehouses;
    return warehouses.filter((w) => {
      if (w.name.toLowerCase().includes(trimmedSearch)) return true;
      return (sectionsByWarehouseId.get(w.id) ?? []).some((s) => s.name.toLowerCase().includes(trimmedSearch));
    });
  }, [warehouses, sectionsByWarehouseId, trimmedSearch]);

  function visibleSectionsFor(warehouseId: string): ItemLocation[] {
    const all = sectionsByWarehouseId.get(warehouseId) ?? [];
    if (!trimmedSearch) return all;
    // Matcher lagerets eget navn -> vis alle dets sektioner uændret;
    // ellers kun de sektioner der selv matcher.
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (warehouse?.name.toLowerCase().includes(trimmedSearch)) return all;
    return all.filter((s) => s.name.toLowerCase().includes(trimmedSearch));
  }

  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ?? null;
  const itemsAtSelectedLocation = useMemo(
    () => (selectedLocationId ? items.filter((item) => item.itemLocationId === selectedLocationId) : []),
    [items, selectedLocationId]
  );

  if (!isOpen) return null;

  function toggleExpand(id: string) {
    setExpandedWarehouseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectLocation(location: ItemLocation) {
    setEditTarget(null);
    setIsCreating(false);
    setSelectedLocationId(location.id);
  }

  function openCreate(parentId: string | null) {
    setEditTarget(null);
    setSelectedLocationId(null);
    setCreateParentId(parentId);
    setNewName('');
    setNewAddress('');
    setNewDescription('');
    setCreateError(null);
    setIsCreating(true);
    if (parentId) setExpandedWarehouseIds((prev) => new Set([...prev, parentId]));
  }

  async function handleCreate() {
    if (!newName.trim()) {
      setCreateError(t('locations.nameRequired'));
      return;
    }
    try {
      const id = await addLocation({
        name: newName.trim(),
        address: newAddress.trim() || null,
        description: newDescription.trim() || null,
        parentLocationId: createParentId,
      }).unwrap();
      setIsCreating(false);
      setSelectedLocationId(id);
    } catch (err) {
      setCreateError(getErrorMessage(err, t('locations.createFailed')));
    }
  }

  function startEdit(location: ItemLocation) {
    setIsCreating(false);
    setSelectedLocationId(null);
    setEditTarget(location);
    setEditName(location.name);
    setEditAddress(location.address ?? '');
    setEditDescription(location.description ?? '');
    setFormError(null);
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editName.trim()) {
      setFormError(t('locations.nameRequired'));
      return;
    }
    try {
      await updateLocation({
        id: editTarget.id,
        name: editName.trim(),
        address: editAddress.trim() || null,
        description: editDescription.trim() || null,
      }).unwrap();
      setSelectedLocationId(editTarget.id);
      setEditTarget(null);
    } catch (err) {
      setFormError(getErrorMessage(err, t('locations.saveFailed')));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLocation({ id: deleteTarget.id }).unwrap();
      if (selectedLocationId === deleteTarget.id) setSelectedLocationId(null);
      setDeleteTarget(null);
    } catch (err) {
      setFormError(getErrorMessage(err, t('locations.deleteFailed')));
      setDeleteTarget(null);
    }
  }

  const deleteTargetSectionCount = deleteTarget && !deleteTarget.parentLocationId
    ? (sectionsByWarehouseId.get(deleteTarget.id)?.length ?? 0)
    : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-gray dark:border-slate-700">
          <h2 className="text-lg font-semibold text-primary dark:text-slate-100">{t('locations.heading')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {formError}
          </div>
        )}

        {/* To-kolonne layout, samme mønster som DataLayerPage.tsx's
            Kategorier/Items-split. */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-hidden flex-1 min-h-0">
          {/* TRÆ */}
          <div className="md:col-span-4 flex flex-col min-h-0">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none dark:text-slate-400" />
              <input
                type="text"
                placeholder={t('locations.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-8 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('locations.clearSearch')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : visibleWarehouses.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8 dark:text-slate-400">
                  {trimmedSearch ? t('locations.noMatch', { query: searchQuery.trim() }) : t('locations.empty')}
                </p>
              ) : (
                visibleWarehouses.map((warehouse) => (
                  <LocationTreeNode
                    key={warehouse.id}
                    location={warehouse}
                    childSections={visibleSectionsFor(warehouse.id)}
                    isWarehouse
                    selectedLocationId={selectedLocationId}
                    onSelectLocation={handleSelectLocation}
                    onAddSection={(warehouseId) => openCreate(warehouseId)}
                    onEditLocation={startEdit}
                    onDeleteLocation={setDeleteTarget}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    isExpanded={trimmedSearch ? true : expandedWarehouseIds.has(warehouse.id)}
                    onToggleExpand={toggleExpand}
                  />
                ))
              )}
            </div>

            {canCreate && (
              <button
                type="button"
                onClick={() => openCreate(null)}
                className="flex items-center justify-center gap-2 px-4 py-2 mt-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                {t('locations.createWarehouseButton')}
              </button>
            )}
          </div>

          {/* HØJRE PANEL: opret/rediger-formular, eller items for den
              valgte lokation - samme rolle som item-listen i
              DataLayerPage.tsx's højre kolonne. */}
          <div className="md:col-span-8 min-h-0 overflow-y-auto rounded-lg border border-border-gray dark:border-slate-700 p-4">
            {isCreating ? (
              <div className="space-y-3 max-w-md">
                <h3 className="text-sm font-semibold text-primary dark:text-slate-100">
                  {createParentId ? t('locations.newSectionHeading') : t('locations.newWarehouseHeading')}
                </h3>
                {createError && <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>}
                <input
                  type="text"
                  placeholder={createParentId ? t('locations.sectionNamePlaceholder') : t('locations.namePlaceholder')}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isAdding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-60"
                  >
                    {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t('common:create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    {t('common:cancel')}
                  </button>
                </div>
              </div>
            ) : editTarget ? (
              <div className="space-y-3 max-w-md">
                <h3 className="text-sm font-semibold text-primary dark:text-slate-100">
                  {editTarget.parentLocationId ? t('locations.editSectionHeading') : t('locations.editWarehouseHeading')}
                </h3>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('locations.namePlaceholderShort')}
                  className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder={t('locations.addressPlaceholder')}
                  className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('locations.descriptionPlaceholder')}
                  className="w-full bg-white border border-border-gray rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {t('common:save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-bg-gray dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    {t('common:cancel')}
                  </button>
                </div>
              </div>
            ) : selectedLocation ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedLocation.parentLocationId ? (
                    <Boxes className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 text-accent shrink-0" />
                  )}
                  <h3 className="text-lg font-semibold text-primary dark:text-slate-100">{selectedLocation.name}</h3>
                </div>
                {selectedLocation.address && (
                  <p className="text-xs text-secondary mb-4 dark:text-slate-400">{selectedLocation.address}</p>
                )}

                {itemsAtSelectedLocation.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-secondary dark:text-slate-400">
                    <Package className="w-8 h-8 mb-2 stroke-[1.5]" />
                    <p className="text-sm">{t('locations.noItemsAtSelected')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-gray border border-border-gray rounded-lg overflow-hidden dark:divide-slate-700 dark:border-slate-700">
                    {itemsAtSelectedLocation.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectItem?.(item)}
                        className="w-full flex items-center justify-between gap-3 p-3 bg-white hover:bg-bg-gray/40 text-left transition-colors dark:bg-slate-800 dark:hover:bg-slate-700/40"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-primary truncate dark:text-slate-100">{item.name}</p>
                          <p className="text-xs text-secondary truncate dark:text-slate-400">{item.sourceCategoryTitle}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-sm text-secondary dark:text-slate-400">
                          <span>{t('quantityValue', { count: item.quantity })}</span>
                          <span className={`px-2 py-0.5 rounded border text-xs ${ITEM_STATUS_STYLES[item.itemStatus]}`}>
                            {td(`datalayer:status.${item.itemStatus}`)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-secondary dark:text-slate-400">
                {t('locations.chooseInTree')}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialogComponent
        isOpen={!!deleteTarget}
        title={deleteTarget?.parentLocationId ? t('locations.deleteSectionTitle') : t('locations.deleteTitle')}
        message={
          deleteTargetSectionCount > 0
            ? t('locations.deleteMessageWithSections', { name: deleteTarget?.name ?? '', count: deleteTargetSectionCount })
            : deleteTarget?.parentLocationId
              ? t('locations.deleteSectionMessage', { name: deleteTarget?.name ?? '' })
              : t('locations.deleteMessage', { name: deleteTarget?.name ?? '' })
        }
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}