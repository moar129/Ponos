
import { useState } from 'react';
import type { CategoryTreeNodeProps } from '../../types/dataLayer/datalayerTypes';
import { ChevronRight, ChevronDown, Folder, Plus } from 'lucide-react';


export function CategoryTreeNode({
  category,
  selectedCategoryId,
  onSelectCategory,
  onAddSubCategory,
}: CategoryTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasSubCategories = category.subCategories && category.subCategories.length > 0;
  const isSelected = selectedCategoryId === category.id;

  return (
    <div className="ml-2 pl-2 border-l border-slate-700/50 my-0.5">
      <div
        className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors group ${
          isSelected
            ? 'bg-slate-700/80 text-white font-medium'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`}
        onClick={() => onSelectCategory(category)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {hasSubCategories ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <Folder
            className={`w-4 h-4 shrink-0 ${
              isSelected ? 'text-[#C7975D]' : 'text-slate-400 group-hover:text-[#C7975D]'
            }`}
          />
          <span className="text-sm truncate">{category.titel}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddSubCategory(category.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600 rounded text-slate-300 transition-opacity ml-1"
          title="Tilføj underkategori"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
