import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readableError } from '../../ErrorMessage';
import { useGetTaskMaterialsQuery } from '../../store/apis/taskApi';
import { useReleaseItemUnitsMutation } from '../../store/apis/categoryApi';

interface TaskMaterialsListProps {
  taskId: string;
  canManage: boolean;
}

// US-42/US-43: liste over materialer tilknyttet en opgave, med mulighed for
// at frigive en ikke-afrapporteret linje igen. Selvstændig (henter selv
// useGetTaskMaterialsQuery) så den kan genbruges både i TaskCard (eksisterende
// opgave) og CreateTaskModal (lige oprettet opgave, samme forms).
export function TaskMaterialsList({ taskId, canManage }: TaskMaterialsListProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const { data: materials = [] } = useGetTaskMaterialsQuery(taskId);
  const [releaseItemUnits, { isLoading: isReleasing, error: releaseError }] = useReleaseItemUnitsMutation();
  const [confirmReleaseId, setConfirmReleaseId] = useState<string | null>(null);

  const handleReleaseMaterial = async (taskMaterialId: string, itemId: string) => {
    await releaseItemUnits({ taskMaterialId, itemId, taskId }).unwrap().catch(() => {
      // Fejlen vises gennem releaseError
    });
    setConfirmReleaseId(null);
  };

  const releaseErrorMessage = readableError(releaseError);

  return (
    <div>
      {releaseErrorMessage && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {releaseErrorMessage}
        </div>
      )}

      {materials.length === 0 ? (
        <p className="text-sm text-secondary dark:text-slate-400">{t('materials.none')}</p>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between rounded-lg border border-border-gray px-4 py-3 dark:border-slate-700"
            >
              <div>
                <p className="font-medium text-primary dark:text-slate-100">{material.itemName}</p>

                <p className="text-xs text-secondary dark:text-slate-400">
                  {material.quantity} {material.unitOfMeasurement} - {material.resolved ? t('materials.resolved') : t('materials.reserved')}
                </p>
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
