import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { asDynamic } from '../../i18n/config';
import { readableError } from '../../ErrorMessage';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import type { ItemStatus } from '../../types/dataLayer/datalayerTypes';
import type { TaskMaterial } from '../../types/Task/Task';

export interface MaterialOutcomeEntry {
  taskMaterialId: string;
  itemId: string;
  outcomes: OutcomeLine[];
}

interface ResolveTaskMaterialsModalProps {
  materials: TaskMaterial[];
  requiresApproval: boolean;
  onConfirm: (entries: MaterialOutcomeEntry[]) => Promise<void>;
  onCancel: () => void;
}

interface OutcomeLine {
  status: ItemStatus | '';
  quantity: number;
}

const NON_FINAL_STATUSES: ItemStatus[] = ['Reserved', 'InUse'];

// US-42/US-43: en opgave med uafrapporterede materialer kan ikke
// færdiggøres - denne modal lader den tildelte bekræfte hvad der reelt
// skete, linje for linje. Selve udførelsen (kalde resolve_task_material_
// units, eller sende en færdigmelding med de valgte udfald som data) sker i
// `onConfirm`, som den kaldende komponent (TaskCard) leverer - modalen
// kender ikke selv forskellen på en opgave med/uden godkendelse, kun at
// resultatet enten anvendes med det samme (uden godkendelse) eller først
// ved godkendelse (med godkendelse, se `requiresApproval`, kun brugt til
// introteksten). `materials` kommer reaktivt fra parent
// (useGetTaskMaterialsQuery), så et delvist mislykket forsøg kun viser de
// linjer der stadig mangler ved næste forsøg - ingen frossen kopi holdes her.
export function ResolveTaskMaterialsModal({ materials, requiresApproval, onConfirm, onCancel }: ResolveTaskMaterialsModalProps) {
  const { t } = useTranslation(['tasks', 'datalayer', 'common']);
  const td = asDynamic(t);

  const unresolved = materials.filter((m) => !m.resolved);

  const [outcomesByMaterial, setOutcomesByMaterial] = useState<Record<string, OutcomeLine[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  // Prefilled with one line per current status group (incl. statuses set
  // manually during the task). Reserved/InUse are not end states, so those
  // lines start empty - nothing is ever applied without an explicit choice.
  const getOutcomes = (material: TaskMaterial): OutcomeLine[] =>
    outcomesByMaterial[material.id] ??
    material.linkedGroups.map((group) => ({
      status: NON_FINAL_STATUSES.includes(group.status) ? '' : group.status,
      quantity: group.quantity,
    }));

  const setOutcomes = (materialId: string, outcomes: OutcomeLine[]) => {
    setOutcomesByMaterial((prev) => ({ ...prev, [materialId]: outcomes }));
  };

  const sumOf = (outcomes: OutcomeLine[]) => outcomes.reduce((sum, o) => sum + (Number.isFinite(o.quantity) ? o.quantity : 0), 0);

  const linkedTotalOf = (material: TaskMaterial) => material.linkedGroups.reduce((sum, g) => sum + g.quantity, 0);

  const isValid = unresolved.every((m) => {
    const outcomes = getOutcomes(m);
    return sumOf(outcomes) === linkedTotalOf(m) && outcomes.every((o) => o.status !== '');
  });

  const handleConfirm = async () => {
    if (!isValid || unresolved.length === 0) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const entries: MaterialOutcomeEntry[] = unresolved.map((material) => ({
      taskMaterialId: material.id,
      itemId: material.itemId,
      outcomes: getOutcomes(material),
    }));

    try {
      await onConfirm(entries);
    } catch (err) {
      setSubmitError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = readableError(submitError);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-xl border border-border-gray bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-primary dark:text-slate-100">{t('materials.resolve.heading')}</h3>
            <p className="mt-1 text-sm text-secondary dark:text-slate-400">
              {requiresApproval ? t('materials.resolve.introApproval') : t('materials.resolve.intro')}
            </p>
          </div>

          <button type="button" onClick={onCancel} className="text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100">
            <X />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="max-h-96 space-y-4 overflow-y-auto">
          {unresolved.map((material) => {
            const outcomes = getOutcomes(material);
            const sum = sumOf(outcomes);
            const linkedTotal = linkedTotalOf(material);

            return (
              <div key={material.id} className="rounded-lg border border-border-gray p-3 dark:border-slate-700">
                <div className="mb-2">
                  <span className="font-medium text-primary dark:text-slate-100">
                    {material.itemName} - {linkedTotal} {material.unitOfMeasurement}
                  </span>
                </div>

                <div className="space-y-2">
                  {outcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={outcome.status}
                        onChange={(e) => {
                          const next = [...outcomes];
                          next[index] = { ...next[index], status: e.target.value as ItemStatus | '' };
                          setOutcomes(material.id, next);
                        }}
                        className="flex-1 rounded-lg border border-border-gray bg-white text-primary px-2 py-1 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="" disabled>
                          {t('materials.chooseStatusPlaceholder')}
                        </option>
                        {ALL_ITEM_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {td(`datalayer:status.${status}`)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min={0}
                        value={outcome.quantity}
                        onChange={(e) => {
                          const next = [...outcomes];
                          next[index] = { ...next[index], quantity: e.target.value === '' ? 0 : Number(e.target.value) };
                          setOutcomes(material.id, next);
                        }}
                        className="w-20 rounded-lg border border-border-gray bg-white text-primary px-2 py-1 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />

                      {outcomes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOutcomes(material.id, outcomes.filter((_, i) => i !== index))}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          {t('materials.resolve.removeOutcomeLine')}
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setOutcomes(material.id, [...outcomes, { status: '', quantity: 0 }])}
                    className="text-xs font-semibold text-accent hover:text-accent-hover"
                  >
                    {t('materials.resolve.addOutcomeLine')}
                  </button>

                  {sum !== linkedTotal && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {t('materials.resolve.quantityMismatch', { expected: linkedTotal, actual: sum })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-border-gray transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          >
            {t('materials.resolve.cancel')}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !isValid || unresolved.length === 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {isSubmitting ? t('materials.resolve.confirming') : t('materials.resolve.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
