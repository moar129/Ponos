import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';
import type { FavoriteRowProps, FavoritesSectionProps } from '../../../types/dataLayer/datalayerTypes';
import { FavoriteStarButton } from './favoriteStarButtonComponent';

function FavoriteRow({ entry, expandedKeys, onToggleExpand }: FavoriteRowProps) {
  const hasChildren = entry.children.length > 0;
  const isOpen = expandedKeys.has(entry.key);

  return (
    <div>
      <div
        onClick={entry.onSelect}
        className={`flex items-center justify-between gap-2 p-1.5 rounded-md cursor-pointer transition-colors group ${
          entry.isSelected
            ? 'bg-accent/15 text-primary font-medium dark:text-slate-100'
            : 'text-secondary hover:bg-bg-gray/60 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(entry.key);
              }}
              className="p-0.5 hover:bg-border-gray rounded text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <span className="text-sm truncate" title={entry.label}>{entry.label}</span>
        </div>
        {entry.onRemove && <FavoriteStarButton isFavorite onToggle={entry.onRemove} />}
      </div>

      {isOpen && hasChildren && (
        <div className="ml-2.5 pl-1 border-l border-border-gray dark:border-slate-700">
          {entry.children.map((child) => (
            <FavoriteRow key={child.key} entry={child} expandedKeys={expandedKeys} onToggleExpand={onToggleExpand} />
          ))}
        </div>
      )}
    </div>
  );
}

// Brugerens stjernemarkerede kategorier/lagre øverst i fanen. Undergrupper
// gemmes ikke som favoritter, men kan foldes ud under favoritten. Ingen
// favoritter -> intet render, så træet forbliver roligt.
export function FavoritesSection({ entries }: FavoritesSectionProps) {
  const { t } = useTranslation('datalayer');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  if (entries.length === 0) return null;

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="mb-3 pb-3 border-b border-border-gray dark:border-slate-700">
      <p className="flex items-center gap-1.5 px-1.5 mb-1 text-xs font-semibold uppercase tracking-wider text-secondary dark:text-slate-400">
        <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" fill="currentColor" />
        {t('favorites.title')}
      </p>
      <div className="space-y-0.5">
        {entries.map((entry) => (
          <FavoriteRow key={entry.key} entry={entry} expandedKeys={expandedKeys} onToggleExpand={toggleExpand} />
        ))}
      </div>
    </div>
  );
}
