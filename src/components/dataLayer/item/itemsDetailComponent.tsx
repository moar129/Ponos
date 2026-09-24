import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { X, Package, Pencil, Trash2, Loader2, Save, Info } from 'lucide-react';
import {
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetItemLocationsQuery,
  useGetItemUnitsQuery,
  useAddItemUnitsMutation,
  useUpdateItemUnitMutation,
  useDeleteItemUnitMutation,
} from '../../../store/apis/categoryApi';
import { LocationPickerComponent } from '../warehouse/locationsPickerComponent';
import { ConfirmDialogComponent } from '../confirmDialogComponent';
import type { ItemDetailComponentProps, ItemLocation, ItemStatus, ItemUnit } from '../../../types/dataLayer/datalayerTypes';
import {
  ALL_ITEM_STATUSES,
  ITEM_STATUS_STYLES,
  UNIT_OF_MEASUREMENT_SUGGESTIONS,
  PACKAGING_SUGGESTIONS_DISCRETE,
  PACKAGING_SUGGESTIONS_MEASURED,
  formatItemQuantity,
} from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';
import { NumberInput } from '../../common/NumberInput';
import { numberInputError, parseNumberInput, toNumberInput } from '../../../utils/numberInput';


export function ItemDetailComponent({ item, onClose, onViewLocation, canCreate, canUpdate, canDelete }: ItemDetailComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [packaging, setPackaging] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('stk');
  // Talfelter holdes som tekst, så de kan være tomme mens man skriver -
  // se utils/numberInput.ts.
  const [packageSize, setPackageSize] = useState('');
  const [itemLocationId, setItemLocationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<'close' | 'cancel' | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [updateItem, { isLoading }] = useUpdateItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteItemMutation();
  const { data: locations = [] } = useGetItemLocationsQuery();

  const { data: units = [], isLoading: unitsLoading } = useGetItemUnitsQuery(item?.id ?? '', { skip: !item });
  const [addItemUnits, { isLoading: isAddingUnits }] = useAddItemUnitsMutation();
  const [updateItemUnit] = useUpdateItemUnitMutation();
  const [deleteItemUnit] = useDeleteItemUnitMutation();
  const [showAddUnits, setShowAddUnits] = useState(false);
  const [addQuantity, setAddQuantity] = useState('1');
  const [addStatus, setAddStatus] = useState<ItemStatus>('Available');
  const [addIsDiscrete, setAddIsDiscrete] = useState(true);
  const [addHasContents, setAddHasContents] = useState(false);
  const [addContentsTotal, setAddContentsTotal] = useState('1');
  const [addContentsStart, setAddContentsStart] = useState('');
  const [addSubmitted, setAddSubmitted] = useState(false);
  const [addContentsEmptyStatus, setAddContentsEmptyStatus] = useState<ItemStatus | ''>('Consumed');
  const [addContentsPartialStatus, setAddContentsPartialStatus] = useState<ItemStatus | ''>('Missing');
  const [addContentsFullStatus, setAddContentsFullStatus] = useState<ItemStatus | ''>('Available');
  const [addSerialNumbersRaw, setAddSerialNumbersRaw] = useState('');
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [unitPendingDelete, setUnitPendingDelete] = useState<{ id: string } | null>(null);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description ?? '');
      setPackaging(item.packaging ?? '');
      setUnitOfMeasurement(item.unitOfMeasurement);
      setPackageSize(toNumberInput(item.packageSize));
      setItemLocationId(item.itemLocationId ?? null);
      setIsEditing(false);
      setFormError(null);
      setPendingDiscardAction(null);
      setIsConfirmingDelete(false);
      setDeleteError(null);
      setShowAddUnits(false);
      setAddQuantity('1');
      setAddStatus('Available');
      setAddIsDiscrete(true);
      setAddHasContents(false);
      setAddContentsTotal('1');
      setAddContentsStart('');
      setAddSubmitted(false);
      setAddContentsEmptyStatus('Consumed');
      setAddContentsPartialStatus('Missing');
      setAddContentsFullStatus('Available');
      setAddSerialNumbersRaw('');
      setUnitsError(null);
      setUnitPendingDelete(null);
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
      packaging !== (item.packaging ?? '') ||
      unitOfMeasurement !== item.unitOfMeasurement ||
      packageSize.trim() !== toNumberInput(item.packageSize) ||
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
  const statusEntries = (Object.entries(item.statusCounts) as [ItemStatus, number][]).filter(([, count]) => (count ?? 0) > 0);

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

  const packageSizeError = numberInputError(packageSize, { required: false });

  // Fejl for "Tilføj enheder"-felterne. Startniveau må gerne være 0.
  const addNumberErrors = {
    quantity: numberInputError(addQuantity),
    contentsTotal: addHasContents ? numberInputError(addContentsTotal) : null,
    contentsStart: !addIsDiscrete && addHasContents ? numberInputError(addContentsStart, { required: false, allowZero: true }) : null,
  };
  // Fejl vises for felter man har skrevet i, og efter et forsøg på at
  // tilføje også for tomme påkrævede felter.
  const visibleAddError = (value: string, error: string | null) =>
    value.trim() !== '' || addSubmitted ? error : null;

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError(t('itemDetail.nameRequired'));
      return;
    }
    if (packageSizeError) {
      setFormError(t('common:numberInput.fixFields'));
      return;
    }

    try {
      await updateItem({
        id: item.id,
        name: name.trim(),
        description: description.trim() || null,
        packaging: packaging.trim() || null,
        unitOfMeasurement: unitOfMeasurement.trim() || 'stk',
        packageSize: parseNumberInput(packageSize),
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

  const handleAddUnits = async () => {
    setAddSubmitted(true);
    if (Object.values(addNumberErrors).some((error) => error !== null)) {
      setUnitsError(t('common:numberInput.fixFields'));
      return;
    }
    setUnitsError(null);
    try {
      const serialNumbers =
        addIsDiscrete && addSerialNumbersRaw.trim()
          ? addSerialNumbersRaw.split(',').map((s) => s.trim())
          : undefined;

      await addItemUnits({
        itemId: item.id,
        quantity: parseNumberInput(addQuantity)!,
        status: addStatus,
        isDiscrete: addIsDiscrete,
        contentsTotal: addHasContents ? parseNumberInput(addContentsTotal)! : undefined,
        contentsStart: !addIsDiscrete && addHasContents ? parseNumberInput(addContentsStart) ?? undefined : undefined,
        contentsEmptyStatus: addHasContents ? addContentsEmptyStatus || null : undefined,
        contentsPartialStatus: addHasContents ? addContentsPartialStatus || null : undefined,
        contentsFullStatus: addHasContents ? addContentsFullStatus || null : undefined,
        packageSize: !addIsDiscrete && !addHasContents ? item.packageSize ?? undefined : undefined,
        serialNumbers,
      }).unwrap();
      setShowAddUnits(false);
      setAddQuantity('1');
      setAddStatus('Available');
      setAddIsDiscrete(true);
      setAddHasContents(false);
      setAddContentsTotal('1');
      setAddContentsStart('');
      setAddSubmitted(false);
      setAddContentsEmptyStatus('Consumed');
      setAddContentsPartialStatus('Missing');
      setAddContentsFullStatus('Available');
      setAddSerialNumbersRaw('');
    } catch (err) {
      setUnitsError(getErrorMessage(err, t('itemDetail.addUnitsFailed')));
    }
  };

  const handleUnitStatusChange = async (unitId: string, status: ItemStatus) => {
    setUnitsError(null);
    try {
      await updateItemUnit({ id: unitId, itemId: item.id, status }).unwrap();
    } catch (err) {
      setUnitsError(getErrorMessage(err, t('itemDetail.updateUnitFailed')));
    }
  };

  // Opdaterer DENNE ENE enheds fyldniveau - ingen søskende-enheder
  // påvirkes (ingen delt pulje).
  const handleUnitContentsChange = async (unit: ItemUnit, contentsRemaining: number) => {
    setUnitsError(null);
    try {
      await updateItemUnit({ id: unit.id, itemId: item.id, contentsRemaining }).unwrap();
    } catch (err) {
      setUnitsError(getErrorMessage(err, t('itemDetail.updateUnitFailed')));
    }
  };

  // Manuel rettelse af quantity på en enhed uden serienummer - enten en
  // Beholders niveau (contentsTotal sat, se docs/dbSchema.sql §15.21) eller
  // en almindelig Målt mængde-rækkes mængde (intet contentsTotal).
  const handleUnitLevelChange = async (unit: ItemUnit, quantity: number) => {
    setUnitsError(null);
    try {
      await updateItemUnit({ id: unit.id, itemId: item.id, quantity }).unwrap();
    } catch (err) {
      setUnitsError(getErrorMessage(err, t('itemDetail.updateUnitFailed')));
    }
  };

  // Inline-rettelse af en enheds mængde/niveau, gemt ved blur. Ugyldig
  // værdi (tom, negativ, 0 hvor det ikke giver mening) gemmes ikke - feltet
  // nulstilles og fejlen vises. Et beholder-niveau må gerne være 0 (tom).
  const commitUnitLevel = (unit: ItemUnit, input: HTMLInputElement, allowZero: boolean) => {
    const error = numberInputError(input.value, { allowZero });
    if (error) {
      input.value = String(unit.quantity);
      setUnitsError(td(error));
      return;
    }
    const newQuantity = parseNumberInput(input.value)!;
    if (newQuantity !== unit.quantity) handleUnitLevelChange(unit, newQuantity);
  };

  const handleDeleteUnit = async () => {
    if (!unitPendingDelete) return;
    setUnitsError(null);
    setIsDeletingUnit(true);
    try {
      await deleteItemUnit({ id: unitPendingDelete.id, itemId: item.id }).unwrap();
      setUnitPendingDelete(null);
    } catch (err) {
      setUnitsError(getErrorMessage(err, t('itemDetail.deleteUnitFailed')));
    } finally {
      setIsDeletingUnit(false);
    }
  };

  const renderUnitRow = (unit: ItemUnit) => (
    <div key={unit.id} className="flex items-center gap-2 px-2 py-1.5 text-xs">
      <span className="flex-1 min-w-0 text-primary dark:text-slate-100">
        {unit.serialNumber ? (
          <span className="truncate block">{unit.serialNumber}</span>
        ) : unit.contentsTotal == null && canUpdate ? (
          <span className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              key={`${unit.id}-${unit.quantity}`}
              defaultValue={unit.quantity}
              onBlur={(e) => commitUnitLevel(unit, e.currentTarget, false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
              }}
              title={t('itemDetail.editLevel')}
              aria-label={t('itemDetail.editLevel')}
              className="w-20 bg-white border border-border-gray rounded px-1 py-0.5 text-xs text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            />
            <span>{item.unitOfMeasurement}</span>
          </span>
        ) : (
          <span className="truncate block">{unit.quantity} {item.unitOfMeasurement}</span>
        )}
        {unit.contentsTotal != null && unit.contentsRemaining != null && (
          <span className="block text-[11px] text-secondary dark:text-slate-400">
            {t('itemDetail.contentsRemaining', { remaining: unit.contentsRemaining, total: unit.contentsTotal })}
          </span>
        )}
        {unit.contentsTotal != null && unit.contentsRemaining == null && (
          <span className="flex items-center gap-1 text-[11px] text-secondary dark:text-slate-400">
            {canUpdate ? (
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                key={`${unit.id}-${unit.quantity}`}
                defaultValue={unit.quantity}
                onBlur={(e) => commitUnitLevel(unit, e.currentTarget, true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                }}
                title={t('itemDetail.editLevel')}
                aria-label={t('itemDetail.editLevel')}
                className="w-16 bg-white border border-border-gray rounded px-1 py-0.5 text-[11px] text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            ) : (
              <span>{unit.quantity}</span>
            )}
            <span>/ {unit.contentsTotal} {item.unitOfMeasurement}</span>
          </span>
        )}
      </span>
      {canUpdate && unit.contentsTotal != null && unit.contentsRemaining != null && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={unit.contentsRemaining >= unit.contentsTotal}
            onClick={() => handleUnitContentsChange(unit, unit.contentsRemaining! + 1)}
            title={t('itemDetail.putOneBack')}
            aria-label={t('itemDetail.putOneBack')}
            className="px-1.5 py-0.5 rounded border border-border-gray text-secondary hover:text-primary hover:bg-white disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            +1
          </button>
          <button
            type="button"
            disabled={unit.contentsRemaining <= 0}
            onClick={() => handleUnitContentsChange(unit, unit.contentsRemaining! - 1)}
            title={t('itemDetail.takeOne')}
            aria-label={t('itemDetail.takeOne')}
            className="px-1.5 py-0.5 rounded border border-border-gray text-secondary hover:text-primary hover:bg-white disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            −1
          </button>
        </div>
      )}
      {canUpdate ? (
        <select
          value={unit.status}
          onChange={(e) => handleUnitStatusChange(unit.id, e.target.value as ItemStatus)}
          className={`px-1.5 py-1 rounded border text-xs ${ITEM_STATUS_STYLES[unit.status] ?? 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700'}`}
        >
          {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
        </select>
      ) : (
        <span className={`px-1.5 py-0.5 rounded border ${ITEM_STATUS_STYLES[unit.status] ?? 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700'}`}>
          {td(`datalayer:status.${unit.status}`)}
        </span>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => setUnitPendingDelete({ id: unit.id })}
          className="p-1 text-secondary hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          title={t('itemDetail.deleteUnit')}
          aria-label={t('itemDetail.deleteUnit')}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={requestClose}>
      <div
        className="bg-white border border-border-gray rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col dark:bg-slate-800 dark:border-slate-700"
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

        <div className="p-4 space-y-4 overflow-y-auto">
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
              {statusEntries.length === 0 ? (
                <span className="text-secondary dark:text-slate-400">{t('itemDetail.noUnits')}</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {statusEntries.map(([status, count]) => (
                    <span key={status} className={`inline-block px-2 py-0.5 rounded border text-xs ${ITEM_STATUS_STYLES[status] ?? 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700'}`}>
                      {td(`datalayer:status.${status}`)}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.quantity')}</span>
              <span className="text-primary dark:text-slate-100">{formatItemQuantity(item)}</span>
            </div>

            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.packaging')}</span>
              {isEditing ? (
                <input
                  type="text"
                  list={unitOfMeasurement.trim().toLowerCase() === 'stk' ? 'packaging-suggestions-discrete' : 'packaging-suggestions-measured'}
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  onKeyDown={handleEnterSaves}
                  placeholder={t(unitOfMeasurement.trim().toLowerCase() === 'stk' ? 'addItems.packagingPlaceholder' : 'addItems.packagingPlaceholderMeasured')}
                  className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              ) : (
                <span className="text-primary dark:text-slate-100">{item.packaging || '—'}</span>
              )}
            </div>
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.unitOfMeasurement')}</span>
              {isEditing ? (
                <input
                  type="text"
                  list="unit-of-measurement-suggestions"
                  value={unitOfMeasurement}
                  onChange={(e) => setUnitOfMeasurement(e.target.value)}
                  onKeyDown={handleEnterSaves}
                  placeholder={t('addItems.unitOfMeasurementPlaceholder')}
                  className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              ) : (
                <span className="text-primary dark:text-slate-100">{item.unitOfMeasurement}</span>
              )}
            </div>

            {(isEditing || item.packageSize != null) && (
              <div className="col-span-2">
                <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('addItems.packageSizeLabel')}</span>
                {isEditing ? (
                  <>
                    <NumberInput
                      placeholder={t('addItems.packageSizePlaceholder')}
                      value={packageSize}
                      onValueChange={setPackageSize}
                      error={packageSizeError}
                      onKeyDown={handleEnterSaves}
                      className="w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                    {packageSize.trim() !== '' && (
                      <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                        {t('addItems.packageSizeHint')}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-primary dark:text-slate-100">{item.packageSize} {item.unitOfMeasurement}</span>
                )}
              </div>
            )}

           <div className="col-span-2">
              {!isEditing && (
                <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('fields.location')}</span>
              )}
              {isEditing ? (
                <LocationPickerComponent
                  value={itemLocationId}
                  onChange={setItemLocationId}
                  canCreate={canCreate}
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

          {!isEditing && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="block text-xs text-secondary uppercase tracking-wide dark:text-slate-400">
                  {t('itemDetail.unitsHeading')}
                </span>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setShowAddUnits((v) => !v)}
                    className="text-xs text-accent hover:text-accent-hover font-medium"
                  >
                    {t('itemDetail.addUnits')}
                  </button>
                )}
              </div>

              {unitsError && (
                <div className="p-2 mb-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                  {unitsError}
                </div>
              )}

              {showAddUnits && (
                <div className="p-3 mb-2 bg-bg-gray/40 border border-border-gray rounded-lg space-y-2 dark:bg-slate-800/40 dark:border-slate-700">
                  <div className="p-2 bg-accent/5 border border-accent/20 rounded-lg text-[11px] text-secondary dark:bg-accent/10 dark:border-accent/30 dark:text-slate-400">
                    <p className="font-medium text-primary mb-0.5 dark:text-slate-100">{t('addItems.helpHeading')}</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li>{t('addItems.helpDiscrete')}</li>
                      <li>{t('addItems.helpMeasured')}</li>
                      <li>{t('addItems.helpContainer')}</li>
                    </ul>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
                      <input
                        type="radio"
                        checked={addIsDiscrete}
                        onChange={() => {
                          setAddIsDiscrete(true);
                          setAddHasContents(false);
                          setAddContentsEmptyStatus('Consumed');
                          setAddContentsPartialStatus('Missing');
                          setAddContentsFullStatus('Available');
                        }}
                      />
                      {t('itemDetail.discreteOption')}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
                      <input
                        type="radio"
                        checked={!addIsDiscrete && !addHasContents}
                        onChange={() => {
                          setAddIsDiscrete(false);
                          setAddHasContents(false);
                        }}
                      />
                      {t('itemDetail.measuredOption')}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-primary dark:text-slate-100">
                      <input
                        type="radio"
                        checked={!addIsDiscrete && addHasContents}
                        onChange={() => {
                          setAddIsDiscrete(false);
                          setAddHasContents(true);
                          // Kind-afhængige defaults (opfølgning 4) - en
                          // beholder skal ikke arve 12-pack'ens "tom=Brugt
                          // op"-default.
                          setAddContentsEmptyStatus('NeedsRefilling');
                          setAddContentsPartialStatus('');
                          setAddContentsFullStatus('Available');
                        }}
                      />
                      {t('itemDetail.containerOption')}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t(
                        !addIsDiscrete && addHasContents
                          ? 'addItems.containerCountPlaceholder'
                          : !addIsDiscrete && !addHasContents && item.packageSize != null
                          ? 'addItems.packageCountLabel'
                          : 'addItems.quantityPlaceholder'
                      )}
                      <NumberInput
                        value={addQuantity}
                        onValueChange={setAddQuantity}
                        error={visibleAddError(addQuantity, addNumberErrors.quantity)}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </label>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('fields.status')}
                      <select
                        value={addStatus}
                        onChange={(e) => setAddStatus(e.target.value as ItemStatus)}
                        className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      >
                        {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                      </select>
                    </label>
                    {addIsDiscrete && (
                      <label className="col-span-2 text-xs text-secondary dark:text-slate-400">
                        {t('itemDetail.serialNumbersPlaceholder')}
                        <input
                          type="text"
                          value={addSerialNumbersRaw}
                          onChange={(e) => setAddSerialNumbersRaw(e.target.value)}
                          className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                        />
                      </label>
                    )}
                    {addIsDiscrete && (
                      <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer dark:text-slate-100">
                        <input
                          type="checkbox"
                          checked={addHasContents}
                          onChange={(e) => setAddHasContents(e.target.checked)}
                        />
                        {t('addItems.hasContentsOption')}
                      </label>
                    )}
                    {addHasContents && (
                      <div>
                        <label className="text-xs text-secondary dark:text-slate-400">
                          {t(addIsDiscrete ? 'addItems.contentsTotalPlaceholder' : 'addItems.contentsTotalPlaceholderMeasured')}
                          <NumberInput
                            value={addContentsTotal}
                            onValueChange={setAddContentsTotal}
                            error={visibleAddError(addContentsTotal, addNumberErrors.contentsTotal)}
                            className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          />
                        </label>
                        {addIsDiscrete && (
                          <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                            <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                            {t('addItems.hasContentsHint')}
                          </p>
                        )}
                      </div>
                    )}
                    {!addIsDiscrete && addHasContents && (
                      <div>
                        <label className="text-xs text-secondary dark:text-slate-400">
                          {t('addItems.contentsStartPlaceholder')}
                          <NumberInput
                            value={addContentsStart}
                            onValueChange={setAddContentsStart}
                            error={visibleAddError(addContentsStart, addNumberErrors.contentsStart)}
                            className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          />
                        </label>
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-secondary dark:text-slate-400">
                          <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                          {t('addItems.containerLevelHint')}
                        </p>
                      </div>
                    )}
                    {addHasContents && (
                      <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <p className="sm:col-span-3 text-[11px] text-secondary uppercase tracking-wide dark:text-slate-400">
                          {t('addItems.contentsStatusHeading')}
                        </p>
                        <p className="sm:col-span-3 -mt-1 flex items-start gap-1 text-[11px] text-secondary normal-case dark:text-slate-400">
                          <Info className="w-3 h-3 mt-0.5 shrink-0 text-accent" />
                          {t('addItems.contentsStatusHint')}
                        </p>
                        <label className="text-xs text-secondary dark:text-slate-400">
                          {t('addItems.contentsEmptyStatusLabel')}
                          <select
                            value={addContentsEmptyStatus}
                            onChange={(e) => setAddContentsEmptyStatus(e.target.value as ItemStatus | '')}
                            className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          >
                            <option value="">{t('addItems.contentsStatusNoChange')}</option>
                            {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-secondary dark:text-slate-400">
                          {t('addItems.contentsPartialStatusLabel')}
                          <select
                            value={addContentsPartialStatus}
                            onChange={(e) => setAddContentsPartialStatus(e.target.value as ItemStatus | '')}
                            className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          >
                            <option value="">{t('addItems.contentsStatusNoChange')}</option>
                            {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-secondary dark:text-slate-400">
                          {t('addItems.contentsFullStatusLabel')}
                          <select
                            value={addContentsFullStatus}
                            onChange={(e) => setAddContentsFullStatus(e.target.value as ItemStatus | '')}
                            className="mt-1 w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          >
                            <option value="">{t('addItems.contentsStatusNoChange')}</option>
                            {ALL_ITEM_STATUSES.map((status) => <option key={status} value={status}>{td(`datalayer:status.${status}`)}</option>)}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUnits(false)}
                      className="px-3 py-1.5 text-xs text-secondary hover:bg-bg-gray rounded-lg dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      {t('common:cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddUnits}
                      disabled={isAddingUnits}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded-lg disabled:opacity-60"
                    >
                      {isAddingUnits && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {t('itemDetail.addUnitsSubmit')}
                    </button>
                  </div>
                </div>
              )}

              {unitsLoading ? (
                <p className="text-xs text-secondary dark:text-slate-400">{t('common:loading')}</p>
              ) : units.length === 0 ? (
                <p className="text-xs text-secondary dark:text-slate-400">{t('itemDetail.noUnits')}</p>
              ) : (
                <div className="border border-border-gray rounded-lg divide-y divide-border-gray dark:border-slate-700 dark:divide-slate-700 max-h-56 overflow-y-auto">
                  {units.map(renderUnitRow)}
                </div>
              )}
            </div>
          )}
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

    <ConfirmDialogComponent
      isOpen={unitPendingDelete !== null}
      title={t('itemDetail.deleteUnitTitle')}
      message={t('itemDetail.deleteUnitMessage')}
      confirmLabel={t('itemDetail.deleteUnitConfirm')}
      isLoading={isDeletingUnit}
      onConfirm={handleDeleteUnit}
      onCancel={() => setUnitPendingDelete(null)}
    />

    <datalist id="unit-of-measurement-suggestions">
      {UNIT_OF_MEASUREMENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
    </datalist>
    <datalist id="packaging-suggestions-discrete">
      {PACKAGING_SUGGESTIONS_DISCRETE.map((s) => <option key={s} value={s} />)}
    </datalist>
    <datalist id="packaging-suggestions-measured">
      {PACKAGING_SUGGESTIONS_MEASURED.map((s) => <option key={s} value={s} />)}
    </datalist>
    </>
  );
}
