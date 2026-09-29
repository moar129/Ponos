import type { TaskColumnKey, TaskColumnTabsProps } from '../../types/Task/Task';

// Kun under lg: over lg står kolonnerne side om side og har egne overskrifter.
export function TaskColumnTabs({
  active,
  onChange,
  availableLabel,
  availableCount,
  inProgressLabel,
  inProgressCount,
}: TaskColumnTabsProps) {
  const tabs: { key: TaskColumnKey; label: string; count: number }[] = [
    { key: 'available', label: availableLabel, count: availableCount },
    { key: 'inProgress', label: inProgressLabel, count: inProgressCount },
  ];

  return (
    <div role="tablist" className="lg:hidden mb-4 flex border-b border-border-gray dark:border-slate-700">
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold transition-colors ${
              isActive
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <span className="truncate">{tab.label}</span>
            <span className="shrink-0 bg-bg-gray text-secondary text-xs font-bold px-2 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-400">
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
