import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { asDynamic } from '../../i18n/config';
import { readableError } from '../../ErrorMessage';
import { useGetTaskMaterialsQuery } from '../../store/apis/taskApi';
import { useChangeTaskMaterialStatusMutation } from '../../store/apis/categoryApi';
import { useApplyMaterialOutcomes } from '../../store/hooks/useApplyMaterialOutcomes';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import type { ItemStatus } from '../../types/dataLayer/datalayerTypes';
import type { MaterialOutcomeEntry, TaskMaterial, TaskMaterialsListProps } from '../../types/Task/Task';
import { ResolveTaskMaterialsModal } from './ResolveTaskMaterialsModal';
import { Alert } from '../common/Alert';
import { ItemStatusSelect } from '../dataLayer/item/ItemStatusSelect';
import { materialLocationLabels } from '../../utils/taskMaterials';

interface StatusChangeForm {
  materialId: string;
  fromStatus: ItemStatus;
  toStatus: ItemStatus | '';
  quantity: number;
}

// US-42/US-43: liste over materialer tilknyttet en opgave, med mulighed for
// at frigive en ikke-afrapporteret linje igen. Selvstændig (henter selv
// useGetTaskMaterialsQuery) så den kan genbruges både i TaskCard (eksisterende
// opgave) og CreateTaskModal (lige oprettet opgave, samme forms).
// Mens opgaven er InProgress kan en statusgruppe (fx "3 kg I brug") skiftes
// helt eller delvist til en anden status - materialet forbliver knyttet til
// opgaven og skal stadig afrapporteres ved færdiggørelse.
export function TaskMaterialsList({ taskId, canManage, taskStatus }: TaskMaterialsListProps) {
  const { t } = useTranslation(['tasks', 'datalayer', 'common']);
  const td = asDynamic(t);
  const { data: materials = [] } = useGetTaskMaterialsQuery(taskId);
  const { release } = useApplyMaterialOutcomes(taskId);
  const [changeTaskMaterialStatus, { isLoading: isChangingStatus, error: changeStatusError }] = useChangeTaskMaterialStatusMutation();
  const [releaseMaterialId, setReleaseMaterialId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState<StatusChangeForm | null>(null);

  const canChangeStatus = canManage && taskStatus === 'InProgress';
  const releaseMaterials = materials.filter((m) => m.id === releaseMaterialId);

  // Brugeren har valgt slutstatus pr. statusgruppe i modalen - fejl kastes
  // videre, så modalen selv viser dem.
  const handleReleaseConfirm = async (entries: MaterialOutcomeEntry[]) => {
    await release(entries);
    setReleaseMaterialId(null);
  };

  const handleChangeStatus = async (material: TaskMaterial) => {
    if (!statusForm || statusForm.toStatus === '') return;

    try {
      await changeTaskMaterialStatus({
        taskMaterialId: material.id,
        itemId: material.itemId,
        taskId,
        fromStatus: statusForm.fromStatus,
        quantity: statusForm.quantity,
        status: statusForm.toStatus,
      }).unwrap();
      setStatusForm(null);
    } catch {
      // Fejlen vises gennem changeStatusError
    }
  };

  const errorMessage = readableError(changeStatusError);

  const inputClass =
    'rounded-lg border border-border-gray bg-white text-primary px-2 py-1 text-xs outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div>
      <Alert className="mb-3">{errorMessage}</Alert>

      {materials.length === 0 ? (
        <p className="text-sm text-secondary dark:text-slate-400">{t('materials.none')}</p>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border-gray px-4 py-3 dark:border-slate-700"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-primary dark:text-slate-100">{material.itemName}</p>

                {!material.resolved && (material.locationLabels.length > 0 || material.hasUnitsWithoutLocation) && (
                  <p className="text-xs text-secondary dark:text-slate-400">
                    {t('materials.locationLabel')}:{' '}
                    {materialLocationLabels(material, t('materials.noLocation')).join(', ')}
                  </p>
                )}

                {material.resolved ? (
                  <p className="text-xs text-secondary dark:text-slate-400">
                    {material.quantity} {material.unitOfMeasurement} - {t('materials.resolved')}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {material.linkedGroups.map((group) => {
                      const isEditing = statusForm?.materialId === material.id && statusForm.fromStatus === group.status;

                      return (
                        <div key={group.status}>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-secondary dark:text-slate-400">
                              {group.quantity} {material.unitOfMeasurement} - {td(`datalayer:status.${group.status}`)}
                            </p>

                            {canChangeStatus && !isEditing && (
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusForm({ materialId: material.id, fromStatus: group.status, toStatus: '', quantity: group.quantity })
                                }
                                className="text-xs font-semibold text-accent hover:text-accent-hover"
                              >
                                {t('materials.changeStatus')}
                              </button>
                            )}
                          </div>

                          {isEditing && statusForm && (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <ItemStatusSelect
                                value={statusForm.toStatus}
                                onChange={(toStatus) => setStatusForm({ ...statusForm, toStatus })}
                                placeholder={t('materials.chooseStatusPlaceholder')}
                                statuses={ALL_ITEM_STATUSES.filter((status) => status !== group.status)}
                                className={inputClass}
                              />

                              <input
                                type="number"
                                min={0}
                                max={group.quantity}
                                value={statusForm.quantity}
                                onChange={(e) =>
                                  setStatusForm({ ...statusForm, quantity: e.target.value === '' ? 0 : Number(e.target.value) })
                                }
                                className={`w-20 ${inputClass}`}
                              />

                              <button
                                type="button"
                                disabled={
                                  isChangingStatus ||
                                  statusForm.toStatus === '' ||
                                  statusForm.quantity <= 0 ||
                                  statusForm.quantity > group.quantity
                                }
                                onClick={() => handleChangeStatus(material)}
                                className="text-xs font-semibold text-accent hover:text-accent-hover disabled:opacity-60"
                              >
                                {isChangingStatus ? t('materials.changingStatus') : t('materials.changeStatusConfirm')}
                              </button>

                              <button
                                type="button"
                                onClick={() => setStatusForm(null)}
                                className="text-xs text-secondary hover:text-primary dark:text-slate-400"
                              >
                                {t('common:cancel')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {canManage && !material.resolved && (
                <button
                  type="button"
                  onClick={() => setReleaseMaterialId(material.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  {t('materials.release')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {releaseMaterials.length > 0 && (
        <ResolveTaskMaterialsModal
          mode="release"
          materials={releaseMaterials}
          onCancel={() => setReleaseMaterialId(null)}
          onConfirm={handleReleaseConfirm}
        />
      )}
    </div>
  );
}
