import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Boxes, MapPin, Tag, CircleSlash } from 'lucide-react';
import type { SummaryChipKind, SummaryChipsProps } from '../../types/dataLayer/datalayerTypes';

const ICONS: Record<SummaryChipKind, typeof Tag> = {
  category: Tag,
  warehouse: MapPin,
  section: Boxes,
  none: CircleSlash,
};

// Samme farver som ItemCategoryTag (marineblå) og ItemLocationTag (guld).
const STYLES: Record<SummaryChipKind, string> = {
  category: 'bg-secondary/5 border-secondary/30 text-secondary dark:bg-slate-700/40 dark:border-slate-600 dark:text-slate-300',
  warehouse: 'bg-accent/10 border-accent/30 text-accent',
  section: 'bg-accent/10 border-accent/30 text-accent',
  none: 'bg-bg-gray/40 border-border-gray text-secondary dark:bg-slate-700/40 dark:border-slate-600 dark:text-slate-400',
};

const HOVER: Record<SummaryChipKind, string> = {
  category: 'hover:bg-secondary/15 dark:hover:bg-slate-700',
  warehouse: 'hover:bg-accent/20',
  section: 'hover:bg-accent/20',
  none: '',
};

// Oversigt over listen: hele chip'en er et link til kategorien/lageret.
// Chips uden mål (fx "Intet lager") er kun visning.
export function SummaryChips({ title, chips }: SummaryChipsProps) {
  const { t } = useTranslation('datalayer');
  if (chips.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2 dark:text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const Icon = ICONS[chip.kind];
          const className = `inline-flex items-center gap-1 max-w-full rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${STYLES[chip.kind]}`;
          const content = (
            <>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{chip.label}</span>
              <span className="shrink-0 opacity-75">{t('page.itemCount', { count: chip.count })}</span>
            </>
          );

          return chip.onNavigate ? (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onNavigate}
              title={`${t('page.goTo')}: ${chip.label}`}
              className={`${className} ${HOVER[chip.kind]}`}
            >
              {content}
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          ) : (
            <span key={chip.id} className={className}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}
