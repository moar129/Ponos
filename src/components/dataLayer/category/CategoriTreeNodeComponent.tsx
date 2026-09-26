import type { CategoryTreeNodeProps } from '../../../types/dataLayer/datalayerTypes';
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown, Folder, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { FavoriteStarButton } from '../favorites/favoriteStarButtonComponent';

export function CategoryTreeNode({
  category,
  selectedCategoryId,
  onSelectCategory,
  onAddSubCategory,
  onEditCategory,
  onDeleteCategory,
  canCreate,
  canUpdate,
  canDelete,
  expandedCategoryIds,
  onToggleExpand,
  isFirst,
  isLast,
  isMoving,
  onMoveUp,
  onMoveDown,
  favoriteIds,
  canFavorite,
  onToggleFavorite,
}: CategoryTreeNodeProps) {
  const { t } = useTranslation('datalayer')
  const isOpen = expandedCategoryIds.has(category.id);
  const isFavorite = favoriteIds.has(category.id);
  const hasSubCategories = category.subCategories && category.subCategories.length > 0;
  const isSelected = selectedCategoryId === category.id;

  return (
    <div className="ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border-gray my-0.5 dark:border-slate-700">
      <div
        className={`flex flex-wrap items-center justify-between gap-y-1 p-1.5 rounded-md cursor-pointer transition-colors group ${isSelected
            ? 'bg-accent/15 text-primary font-medium dark:text-slate-100'
            : 'text-secondary hover:bg-bg-gray/60 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100'
          }`}
        onClick={() => onSelectCategory(category)}
      >
        {/*
          min-w-[7rem] + flex-1 (i stedet for min-w-0) sikrer, at navnet
          altid har en garanteret minimumsbredde og aldrig presses til 0px.
          Kan handlingsknapperne (som har shrink-0) ikke være på samme
          linje som navnet, folder flex-wrap dem ned på en ny linje i
          stedet for at de "spiser" navnets plads - vigtigt på iPad/
          smalle skærme, hvor knapperne altid er synlige (ikke kun ved hover).
        */}
        <div className="flex items-center gap-1.5 overflow-hidden min-w-[7rem] flex-1">
          {hasSubCategories ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(category.id);
              }}
              className="p-0.5 hover:bg-border-gray rounded text-secondary hover:text-primary shrink-0 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <Folder
            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-secondary group-hover:text-accent dark:text-slate-400'
              }`}
          />
          <span className="text-sm truncate">{category.title}</span>
        </div>

        {/*
          Handlingsknapperne er altid synlige på touch-skærme (op til lg),
          fordi opacity-0/group-hover aldrig aktiveres uden en mus. Fra lg
          og op (hvor mus er sandsynlig) skjules de bag hover som før, for
          at holde træet roligt at se på. ml-auto sikrer at de flugter til
          højre, både når de er på samme linje som navnet og når de er
          foldet ned på deres egen linje. Stjernen ligger uden for hover-
          containeren, så en markeret favorit altid er synlig.
        */}
        <div className="flex items-center shrink-0 ml-auto">
          {canFavorite && (
            <FavoriteStarButton
              isFavorite={isFavorite}
              onToggle={() => onToggleFavorite(category.id)}
            />
          )}
          <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {canUpdate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(category);
                }}
                disabled={isFirst || isMoving}
                className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-slate-700 dark:text-slate-400"
                title={t('tree.moveUp')}
                aria-label={t('tree.moveUp')}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            {canUpdate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(category);
                }}
                disabled={isLast || isMoving}
                className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors ml-0.5 sm:ml-1 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-slate-700 dark:text-slate-400"
                title={t('tree.moveDown')}
                aria-label={t('tree.moveDown')}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}

            {canUpdate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCategory(category);
                }}
                className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors ml-0.5 sm:ml-1 dark:hover:bg-slate-700 dark:text-slate-400"
                title={t('tree.editCategory')}
                aria-label={t('tree.editCategory')}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {canCreate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubCategory(category.id);
                }}
                className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors ml-0.5 sm:ml-1 dark:hover:bg-slate-700 dark:text-slate-400"
                title={t('tree.addSubcategory')}
                aria-label={t('tree.addSubcategory')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category);
                }}
                className="p-1.5 lg:p-1 hover:bg-red-50 rounded text-secondary hover:text-red-600 transition-colors ml-0.5 sm:ml-1 dark:hover:bg-red-900/30 dark:text-slate-400 dark:hover:text-red-400"
                title={t('tree.deleteCategory')}
                aria-label={t('tree.deleteCategory')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isOpen && hasSubCategories && (
        <div className="mt-0.5">
          {category.subCategories.map((subCat, idx) => (
            <CategoryTreeNode
              key={subCat.id}
              category={subCat}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              onAddSubCategory={onAddSubCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              expandedCategoryIds={expandedCategoryIds}
              onToggleExpand={onToggleExpand}
              isFirst={idx === 0}
              isLast={idx === category.subCategories.length - 1}
              isMoving={isMoving}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              favoriteIds={favoriteIds}
              canFavorite={canFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}