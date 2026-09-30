import type { CategoryTreeNodeProps } from '../../../types/dataLayer/datalayerTypes';
import { useTranslation } from 'react-i18next'
import { Folder, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { TreeActionButton, TreeRow } from '../TreeRow';

export function CategoryTreeNode(props: CategoryTreeNodeProps) {
  const {
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
  } = props;
  const { t } = useTranslation('datalayer')
  const isOpen = expandedCategoryIds.has(category.id);
  const hasSubCategories = category.subCategories.length > 0;

  return (
    <div className="ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border-gray my-0.5 dark:border-slate-700">
      <TreeRow
        label={category.title}
        icon={Folder}
        isSelected={selectedCategoryId === category.id}
        onSelect={() => onSelectCategory(category)}
        hasChildren={hasSubCategories}
        isExpanded={isOpen}
        onToggleExpand={() => onToggleExpand(category.id)}
        nameMinWidthClass="min-w-[7rem]"
        favorite={canFavorite ? { isFavorite: favoriteIds.has(category.id), onToggle: () => onToggleFavorite(category.id) } : undefined}
        actions={
          <>
            {canUpdate && (
              <TreeActionButton icon={ArrowUp} label={t('tree.moveUp')} onClick={() => onMoveUp(category)} disabled={isFirst || isMoving} />
            )}
            {canUpdate && (
              <TreeActionButton icon={ArrowDown} label={t('tree.moveDown')} onClick={() => onMoveDown(category)} disabled={isLast || isMoving} />
            )}
            {canUpdate && (
              <TreeActionButton icon={Pencil} label={t('tree.editCategory')} onClick={() => onEditCategory(category)} />
            )}
            {canCreate && (
              <TreeActionButton icon={Plus} label={t('tree.addSubcategory')} onClick={() => onAddSubCategory(category.id)} />
            )}
            {canDelete && (
              <TreeActionButton icon={Trash2} label={t('tree.deleteCategory')} onClick={() => onDeleteCategory(category)} danger />
            )}
          </>
        }
      />

      {isOpen && hasSubCategories && (
        <div className="mt-0.5">
          {category.subCategories.map((subCat, idx) => (
            <CategoryTreeNode
              {...props}
              key={subCat.id}
              category={subCat}
              isFirst={idx === 0}
              isLast={idx === category.subCategories.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
