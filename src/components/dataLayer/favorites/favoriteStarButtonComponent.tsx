import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import type { FavoriteStarButtonProps } from '../../../types/dataLayer/datalayerTypes';

// Delt af kategori- og lagertræet samt favoritlisten. En markeret favorit
// er altid synlig; en tom stjerne følger trærækkens hover-regel (synlig på
// touch, skjult bag hover fra lg).
export function FavoriteStarButton({ isFavorite, onToggle, variant = 'row' }: FavoriteStarButtonProps) {
  const { t } = useTranslation('datalayer');
  const label = isFavorite ? t('favorites.remove') : t('favorites.add');
  const isHeading = variant === 'heading';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${isHeading ? 'p-1.5 shrink-0' : 'p-1.5 lg:p-1'} hover:bg-border-gray rounded transition-colors dark:hover:bg-slate-700 ${
        isFavorite
          ? 'text-amber-500 dark:text-amber-400'
          : isHeading
            ? 'text-secondary hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400'
            : 'text-secondary dark:text-slate-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
      }`}
      title={label}
      aria-label={label}
      aria-pressed={isFavorite}
    >
      <Star className={isHeading ? 'w-5 h-5' : 'w-3.5 h-3.5'} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
