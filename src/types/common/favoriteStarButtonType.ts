export interface FavoriteStarButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  // Overskrift: tom stjerne altid synlig (ingen hover-regel) og større.
  variant?: 'row' | 'heading';
}
