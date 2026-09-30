import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next'
import { asDynamic } from '../../../i18n/config'
import { Package, Pencil, Trash2, Loader2, Save, Info } from 'lucide-react';
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
import { ConfirmDialog } from '../../common/ConfirmDialog';
import type { ItemDetailComponentProps, ItemStatus, ItemUnit } from '../../../types/dataLayer/datalayerTypes';
import {
  ITEM_STATUS_STYLES,
  formatItemQuantity,
} from '../../../types/dataLayer/datalayerTypes';
import { getErrorMessage } from '../../../ErrorMessage';
import { NumberInput } from '../../common/NumberInput';
import { numberInputError, parseNumberInput, toNumberInput } from '../../../utils/numberInput';
import { joinPath, locationPathLabel, PATH_SEPARATOR } from '../../../utils/locationPathLabel';
import { Alert } from '../../common/Alert';
import { Modal } from '../../common/Modal';
import { ItemStatusBadges } from '../itemStatusBadgesComponent';
import { ItemStatusSelect } from './ItemStatusSelect';
import { ItemKindHelp, ItemKindRadios, ItemSuggestionLists, ItemUnitFields } from './ItemUnitFields';
import {
  emptyItemUnitForm,
  hasItemUnitNumberErrors,
  itemKindPatch,
  itemUnitNumberErrors,
  quantityLabelKey,
  toItemUnitPayload,
} from '../../../utils/itemUnitForm';
import type { ItemUnitFormValues } from '../../../types/dataLayer/datalayerTypes';


const COMPACT_INPUT = 'w-full bg-white border border-border-gray rounded-lg px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';

export function ItemDetailComponent({ item, onClose, onViewLocation, canCreate, canUpdate, canDelete }: ItemDetailComponentProps) {
  const { t } = useTranslation(['datalayer', 'common'])
  const td = asDynamic(t)
  // Kalderen mounter komponenten pr. item (key), så felterne altid starter
  // fra det valgte items værdier.
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? '');
  const [packaging, setPackaging] = useState(item.packaging ?? '');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState(item.unitOfMeasurement);
  // Talfelter holdes som tekst, så de kan være tomme mens man skriver -
  // se utils/numberInput.ts.
  const [packageSize, setPackageSize] = useState(toNumberInput(item.packageSize));
  const [itemLocationId, setItemLocationId] = useState<string | null>(item.itemLocationId ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<'close' | 'cancel' | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [updateItem, { isLoading }] = useUpdateItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteItemMutation();
  const { data: locations = [] } = useGetItemLocationsQuery();

  const { data: units = [], isLoading: unitsLoading } = useGetItemUnitsQuery(item.id);
  const [addItemUnits, { isLoading: isAddingUnits }] = useAddItemUnitsMutation();
  const [updateItemUnit] = useUpdateItemUnitMutation();
  const [deleteItemUnit] = useDeleteItemUnitMutation();
  const [showAddUnits, setShowAddUnits] = useState(false);
  const [addUnits, setAddUnits] = useState<ItemUnitFormValues>(emptyItemUnitForm);
  const [addSubmitted, setAddSubmitted] = useState(false);
  const patchAddUnits = (patch: Partial<ItemUnitFormValues>) => setAddUnits((current) => ({ ...current, ...patch }));
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [unitPendingDelete, setUnitPendingDelete] = useState<{ id: string } | null>(null);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  const hasUnsavedChanges =
    (name !== item.name ||
      description !== (item.description ?? '') ||
      packaging !== (item.packaging ?? '') ||
      unitOfMeasurement !== item.unitOfMeasurement ||
      packageSize.trim() !== toNumberInput(item.packageSize) ||
      itemLocationId !== (item.itemLocationId ?? null));

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

  const packageSizeError = numberInputError(packageSize, { required: false });

  // Fejl for "Tilføj enheder"-felterne vises for felter man har skrevet
  // i, og efter et forsøg på at tilføje også for tomme påkrævede felter.
  const visibleAddError = (field: keyof ReturnType<typeof itemUnitNumberErrors>) =>
    addUnits[field].trim() !== '' || addSubmitted ? itemUnitNumberErrors(addUnits)[field] : null;

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
    if (hasItemUnitNumberErrors(addUnits)) {
      setUnitsError(t('common:numberInput.fixFields'));
      return;
    }
    setUnitsError(null);
    try {
      await addItemUnits({
        ...toItemUnitPayload(addUnits, item.packageSize),
        itemId: item.id,
        status: addUnits.itemStatus,
      }).unwrap();
      setShowAddUnits(false);
      setAddUnits(emptyItemUnitForm());
      setAddSubmitted(false);
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
    <div key={unit.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-xs">
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
        <ItemStatusSelect
          value={unit.status}
          onChange={(status) => status && handleUnitStatusChange(unit.id, status)}
          className={`px-1.5 py-1 rounded border text-xs ${ITEM_STATUS_STYLES[unit.status]}`}
        />
      ) : (
        <span className={`px-1.5 py-0.5 rounded border ${ITEM_STATUS_STYLES[unit.status]}`}>
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
    <Modal
      onClose={requestClose}
      icon={Package}
      size="2xl"
      title={isEditing ? t('itemDetail.heading') : item.name}
      subtitle={!isEditing && (() => {
        const parts = item.sourceCategoryTitle.split(PATH_SEPARATOR);
        const ancestors = parts.slice(0, -1);
        return (
          <span className="block truncate text-xs">
            {t('itemDetail.inCategory')} {ancestors.length > 0 && `${joinPath(ancestors)}${PATH_SEPARATOR}`}
            <strong className="text-primary font-medium dark:text-slate-100">{parts[parts.length - 1]}</strong>
          </span>
        );
      })()}
      headerActions={!isEditing && (
        <div className="flex items-center gap-1 shrink-0">
          {canUpdate && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md hover:bg-bg-gray text-secondary hover:text-primary dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
              title={t('itemDetail.editItem')}
              aria-label={t('itemDetail.editItem')}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1.5 rounded-md hover:bg-red-50 text-secondary hover:text-red-600 dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-red-400"
              title={t('itemDetail.deleteItem')}
              aria-label={t('itemDetail.deleteItem')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      footer={isEditing && (
        <>
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common:save')}
          </button>
        </>
      )}
    >
        <div className="space-y-4">
          <Alert>{formError}</Alert>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('common:status')}</span>
              <ItemStatusBadges item={item} className="justify-start" />
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
            <span className="block text-xs text-secondary uppercase tracking-wide mb-1 dark:text-slate-400">{t('common:description')}</span>
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

              <Alert className="mb-2">{unitsError}</Alert>

              {showAddUnits && (
                <div className="p-3 mb-2 bg-bg-gray/40 border border-border-gray rounded-lg space-y-2 dark:bg-slate-800/40 dark:border-slate-700">
                  <ItemKindHelp className="text-[11px]" />
                  <ItemKindRadios values={addUnits} onKindChange={(kind) => patchAddUnits(itemKindPatch(kind))} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t(quantityLabelKey(addUnits, item.packageSize != null))}
                      <NumberInput
                        value={addUnits.quantity}
                        onValueChange={(quantity) => patchAddUnits({ quantity })}
                        error={visibleAddError('quantity')}
                        className={`mt-1 ${COMPACT_INPUT}`}
                      />
                    </label>
                    <label className="text-xs text-secondary dark:text-slate-400">
                      {t('common:status')}
                      <ItemStatusSelect
                        value={addUnits.itemStatus}
                        onChange={(itemStatus) => itemStatus && patchAddUnits({ itemStatus })}
                        className={`mt-1 ${COMPACT_INPUT}`}
                      />
                    </label>
                    <ItemUnitFields
                      values={addUnits}
                      onChange={patchAddUnits}
                      errorFor={visibleAddError}
                      inputClass={COMPACT_INPUT}
                      selectClass={COMPACT_INPUT}
                    />
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-accent-text rounded-lg disabled:opacity-60"
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

    </Modal>

    <ConfirmDialog
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

    <ConfirmDialog
      isOpen={isConfirmingDelete}
      title={t('itemDetail.deleteTitle')}
      message={t('itemDetail.deleteMessage', { name: item.name })}
      error={deleteError}
      confirmLabel={t('common:delete')}
      isLoading={isDeleting}
      onConfirm={handleDelete}
      onCancel={() => { setIsConfirmingDelete(false); setDeleteError(null); }}
    />

    <ConfirmDialog
      isOpen={unitPendingDelete !== null}
      title={t('itemDetail.deleteUnitTitle')}
      message={t('itemDetail.deleteUnitMessage')}
      confirmLabel={t('common:delete')}
      isLoading={isDeletingUnit}
      onConfirm={handleDeleteUnit}
      onCancel={() => setUnitPendingDelete(null)}
    />

    <ItemSuggestionLists />
    </>
  );
}
