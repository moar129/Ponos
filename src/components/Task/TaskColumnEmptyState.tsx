import { useTranslation } from 'react-i18next';
import type { TaskColumnEmptyStateProps } from '../../types/Task/Task';

// Tom kolonne på /tasks og /tasks/mine. Skyldes det søgning/filter, siges
// det direkte med en Nulstil-knap - ellers ligner det, at der ingen
// opgaver er.
export function TaskColumnEmptyState({ emptyText, hasActiveFilters, onReset }: TaskColumnEmptyStateProps) {
  const { t } = useTranslation(['tasks', 'common']);

  if (!hasActiveFilters) {
    return <p className="text-secondary text-sm py-8 text-center dark:text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="py-8 text-center">
      <p className="text-secondary text-sm dark:text-slate-400">{t('filter.noMatches')}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 text-sm text-secondary hover:text-primary border border-border-gray rounded-lg px-4 py-2 hover:border-secondary transition dark:text-slate-400 dark:hover:text-slate-100 dark:border-slate-700"
      >
        {t('common:reset')}
      </button>
    </div>
  );
}
