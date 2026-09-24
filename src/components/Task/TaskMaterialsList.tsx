import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { asDynamic } from '../../i18n/config';
import { readableError } from '../../ErrorMessage';
import { useGetTaskMaterialsQuery } from '../../store/apis/taskApi';
import { useChangeTaskMaterialStatusMutation, useReleaseItemUnitsMutation } from '../../store/apis/categoryApi';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import type { ItemStatus } from '../../types/dataLayer/datalayerTypes';
import type { TaskMaterial, TaskMaterialsListProps } from '../../types/Task/Task';

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
  const [releaseItemUnits, { isLoading: isReleasing, error: releaseError }] = useReleaseItemUnitsMutation();
  const [changeTaskMaterialStatus, { isLoading: isChangingStatus, error: changeStatusError }] = useChangeTaskMaterialStatusMutation();
  const [confirmReleaseId, setConfirmReleaseId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState<StatusChangeForm | null>(null);

  const canChangeStatus = canManage && taskStatus === 'InProgress';

  const handleReleaseMaterial = async (taskMaterialId: string, itemId: string) => {
    await releaseItemUnits({ taskMaterialId, itemId, taskId }).unwrap().catch(() => {
      // Fejlen vises gennem releaseError
    });
    setConfirmReleaseId(null);
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

  const errorMessage = readableError(releaseError) ?? readableError(changeStatusError);

  const inputClass =
    'rounded-lg border border-border-gray bg-white text-primary px-2 py-1 text-xs outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div>
      {errorMessage && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {errorMessage}
        </div>
      )}

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
                              <select
                                value={statusForm.toStatus}
                                onChange={(e) => setStatusForm({ ...statusForm, toStatus: e.target.value as ItemStatus | '' })}
                                className={inputClass}
                              >
                                <option value="" disabled>
                                  {t('materials.chooseStatusPlaceholder')}
                                </option>
                                {ALL_ITEM_STATUSES.filter((status) => status !== group.status).map((status) => (
                                  <option key={status} value={status}>
                                    {td(`datalayer:status.${status}`)}
                                  </option>
                                ))}
                              </select>

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
                confirmReleaseId === material.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary dark:text-slate-400">
                      {t('materials.confirmRelease', { name: material.itemName })}
                    </span>

                    <button
                      type="button"
                      disabled={isReleasing}
                      onClick={() => handleReleaseMaterial(material.id, material.itemId)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      {isReleasing ? t('materials.releasing') : t('common:confirmDeleteYes')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmReleaseId(null)}
                      className="text-xs text-secondary hover:text-primary dark:text-slate-400"
                    >
                      {t('common:cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReleaseId(material.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    {t('materials.release')}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
