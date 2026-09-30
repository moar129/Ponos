import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readableError } from '../../ErrorMessage';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import type { ItemStatus } from '../../types/dataLayer/datalayerTypes';
import type { MaterialOutcomeEntry, TaskMaterial } from '../../types/Task/Task';
import { Alert } from '../common/Alert';
import { Modal } from '../common/Modal';
import { ItemStatusSelect } from '../dataLayer/item/ItemStatusSelect';

// resolve = afrapportering ved færdiggørelse; release = "Frigiv" på én
// linje; deleteTask = alle linjer frigives, før opgaven slettes.
export type MaterialOutcomesMode = 'resolve' | 'release' | 'deleteTask';

interface ResolveTaskMaterialsModalProps {
  materials: TaskMaterial[];
  mode?: MaterialOutcomesMode;
  requiresApproval?: boolean;
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
// Genbruges til "Frigiv"/slet opgave (mode release/deleteTask): samme valg af
// slutstatus pr. statusgruppe, men Reserved/InUse kan ikke vælges.
export function ResolveTaskMaterialsModal({
  materials,
  mode = 'resolve',
  requiresApproval = false,
  onConfirm,
  onCancel,
}: ResolveTaskMaterialsModalProps) {
  const { t } = useTranslation(['tasks', 'datalayer', 'common']);

  const isRelease = mode !== 'resolve';
  const statusOptions = isRelease ? ALL_ITEM_STATUSES.filter((s) => !NON_FINAL_STATUSES.includes(s)) : ALL_ITEM_STATUSES;

  const unresolved = materials.filter((m) => !m.resolved);

  const [outcomesByMaterial, setOutcomesByMaterial] = useState<Record<string, OutcomeLine[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  // Prefilled with one line per current status group (incl. statuses set
  // manually during the task). Reserved/InUse are not end states: on
  // resolve those lines start empty (explicit choice required), on release
  // they start as Available (back in stock). Nothing is applied before
  // the user confirms.
  const getOutcomes = (material: TaskMaterial): OutcomeLine[] =>
    outcomesByMaterial[material.id] ??
    material.linkedGroups.map((group) => ({
      status: NON_FINAL_STATUSES.includes(group.status) ? (isRelease ? 'Available' : '') : group.status,
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
      // isValid guarantees no empty status.
      outcomes: getOutcomes(material).map((o) => ({ status: o.status as ItemStatus, quantity: o.quantity })),
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

  const texts =
    mode === 'deleteTask'
      ? {
          heading: t('materials.deleteTaskModal.heading'),
          intro: t('materials.deleteTaskModal.intro'),
          confirm: t('materials.deleteTaskModal.confirm'),
          confirming: t('materials.deleteTaskModal.confirming'),
        }
      : mode === 'release'
        ? {
            heading: t('materials.releaseModal.heading'),
            intro: t('materials.releaseModal.intro'),
            confirm: t('materials.releaseModal.confirm'),
            confirming: t('materials.releaseModal.confirming'),
          }
        : {
            heading: t('materials.resolve.heading'),
            intro: requiresApproval ? t('materials.resolve.introApproval') : t('materials.resolve.intro'),
            confirm: t('materials.resolve.confirm'),
            confirming: t('materials.resolve.confirming'),
          };

  return (
    <Modal
      onClose={onCancel}
      title={texts.heading}
      subtitle={texts.intro}
      size="lg"
      closeOnBackdrop={false}
      disableClose={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-border-gray bg-bg-gray px-4 py-2 text-sm text-secondary hover:bg-border-gray transition-colors disabled:opacity-60 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          >
            {t('common:cancel')}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !isValid || unresolved.length === 0}
            className="rounded-lg bg-accent px-4 py-2 text-sm text-accent-text hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {isSubmitting ? texts.confirming : texts.confirm}
          </button>
        </>
      }
    >
        <Alert className="mb-4">{errorMessage}</Alert>

        <div className="space-y-4">
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
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <ItemStatusSelect
                        value={outcome.status}
                        onChange={(status) => {
                          const next = [...outcomes];
                          next[index] = { ...next[index], status };
                          setOutcomes(material.id, next);
                        }}
                        placeholder={t('materials.chooseStatusPlaceholder')}
                        statuses={statusOptions}
                        className="flex-1 rounded-lg border border-border-gray bg-white text-primary px-2 py-1 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />

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
                          {t('common:remove')}
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
    </Modal>
  );
}
