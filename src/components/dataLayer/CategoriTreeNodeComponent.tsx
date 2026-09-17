import { useState } from 'react';
import type { CategoryTreeNodeProps } from '../../types/dataLayer/datalayerTypes';
import { ChevronRight, ChevronDown, Folder, Plus, Pencil, Trash2 } from 'lucide-react';

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
}: CategoryTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubCategories = category.subCategories && category.subCategories.length > 0;
  const isSelected = selectedCategoryId === category.id;

  return (
    <div className="ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border-gray my-0.5">
      <div
        className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors group ${isSelected
            ? 'bg-accent/15 text-primary font-medium'
            : 'text-secondary hover:bg-bg-gray/60 hover:text-primary'
          }`}
        onClick={() => onSelectCategory(category)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          {hasSubCategories ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="p-0.5 hover:bg-border-gray rounded text-secondary hover:text-primary shrink-0"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <Folder
            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-secondary group-hover:text-accent'
              }`}
          />
          <span className="text-sm truncate">{category.title}</span>
        </div>

        {/*
          Handlingsknapperne er altid synlige på touch-skærme (op til lg),
          fordi opacity-0/group-hover aldrig aktiveres uden en mus. Fra lg
          og op (hvor mus er sandsynlig) skjules de bag hover som før, for
          at holde træet roligt at se på.
        */}
        <div className="flex items-center shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {canUpdate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditCategory(category);
              }}
              className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors"
              title="Rediger kategori"
              aria-label="Rediger kategori"
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
              className="p-1.5 lg:p-1 hover:bg-border-gray rounded text-secondary transition-colors ml-0.5 sm:ml-1"
              title="Tilføj underkategori"
              aria-label="Tilføj underkategori"
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
              className="p-1.5 lg:p-1 hover:bg-red-50 rounded text-secondary hover:text-red-600 transition-colors ml-0.5 sm:ml-1"
              title="Slet kategori"
              aria-label="Slet kategori"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isOpen && hasSubCategories && (
        <div className="mt-0.5">
          {category.subCategories.map((subCat) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}