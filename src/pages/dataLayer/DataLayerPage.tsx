import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetCategoryTreeQuery } from '../../store/apis/categoryApi';
import type { DataLayerCat, AggregatedItem } from '../../types/dataLayer/datalayerTypes';
import { CategoryTreeNode } from '../../components/dataLayer/CategoriTreeNodeComponent';
import { AddCategoryComponent } from '../../components/dataLayer/addCategoryComponent';
import { AddItemsComponent } from '../../components/dataLayer/addItemsComponent';
import { ItemDetailComponent } from '../../components/dataLayer/itemsDetailComponent';
import { EditCategoryComponent } from '../../components/dataLayer/editCategoryComponent';
import { DeleteCategoryComponent } from '../../components/dataLayer/deleteCategoryComponent';
import { DeleteItemsComponent } from '../../components/dataLayer/deleteItemComponent';
import { getAggregatedItems } from '../../store/slices/dataLayersSlices/aggregatedItems';
import { Search, Filter, Plus, Box, Loader2, Trash2, X as XIcon } from 'lucide-react';

export function DataLayerPage() {
  const { data: categoryTree = [], isLoading, error } = useGetCategoryTreeQuery();

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('catId');

  const [selectedCategory, setSelectedCategory] = useState<DataLayerCat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Kategori: opret
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addParentTitle, setAddParentTitle] = useState<string | undefined>(undefined);

  // Kategori: rediger
  const [editCategoryTarget, setEditCategoryTarget] = useState<DataLayerCat | null>(null);

  // Kategori: slet
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<DataLayerCat | null>(null);

  // Items: tilføj
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);

  // Items: detalje / rediger / slet enkelt
  const [selectedItem, setSelectedItem] = useState<AggregatedItem | null>(null);

  // Items: vælg flere / slet flere
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDeleteItemsOpen, setIsDeleteItemsOpen] = useState(false);

  function findCategoryInTree(
    categories: DataLayerCat[],
    id: string
  ): DataLayerCat | null {
    for (const cat of categories) {
      if (cat.id === id) return cat;
      if (cat.subCategories.length > 0) {
        const found = findCategoryInTree(cat.subCategories, id);
        if (found) return found;
      }
    }
    return null;
  }

  useEffect(() => {
    if (categoryTree.length > 0) {
      if (categoryIdFromUrl) {
        const found = findCategoryInTree(categoryTree, categoryIdFromUrl);
        if (found) {
          setSelectedCategory(found);
          return;
        }
      }
      setSelectedCategory(categoryTree[0]);
    }
  }, [categoryIdFromUrl, categoryTree]);

  const handleSelectCategory = (category: DataLayerCat) => {
    setSelectedCategory(category);
    setSearchParams({ catId: category.id });
    exitSelectMode(); // undgå at select-mode "overlever" et kategoriskift
  };

  const handleOpenAddModal = (parentId: string | null) => {
    setAddParentId(parentId);
    if (parentId) {
      const parentCat = findCategoryInTree(categoryTree, parentId);
      setAddParentTitle(parentCat?.title);
    } else {
      setAddParentTitle(undefined);
    }
    setIsAddModalOpen(true);
  };

  const handleCategoryAdded = (newCategoryId: string) => {
    setSearchParams({ catId: newCategoryId });
  };

  const handleCategoriesDeleted = (deletedIds: string[]) => {
    if (selectedCategory && deletedIds.includes(selectedCategory.id)) {
      setSelectedCategory(null);
      setSearchParams({});
    }
  };

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedItemIds(new Set());
  };

  const handleItemsDeleted = () => {
    exitSelectMode();
  };

  const errorMessage =
    error && typeof error === 'object' && 'error' in error
      ? (error as { error: string }).error
      : null;

  const aggregatedItems = selectedCategory ? getAggregatedItems(selectedCategory) : [];
  const itemsMarkedForDeletion = aggregatedItems.filter((item) => selectedItemIds.has(item.id));

  return (
    <div className="space-y-6">
      <AddCategoryComponent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        parentId={addParentId}
        parentTitle={addParentTitle}
        onSuccess={handleCategoryAdded}
      />

      <EditCategoryComponent
        isOpen={!!editCategoryTarget}
        onClose={() => setEditCategoryTarget(null)}
        category={editCategoryTarget}
      />

      <DeleteCategoryComponent
        isOpen={!!deleteCategoryTarget}
        category={deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onDeleted={handleCategoriesDeleted}
      />

      <AddItemsComponent
        isOpen={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        categoryId={selectedCategory?.id ?? null}
        categoryTitle={selectedCategory?.title}
      />

      <ItemDetailComponent item={selectedItem} onClose={() => setSelectedItem(null)} />

      <DeleteItemsComponent
        isOpen={isDeleteItemsOpen}
        items={itemsMarkedForDeletion}
        onClose={() => setIsDeleteItemsOpen(false)}
        onDeleted={handleItemsDeleted}
      />

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Søg..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3 bg-primary rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Kategorier
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-1">
                {categoryTree.map((cat) => (
                  <CategoryTreeNode
                    key={cat.id}
                    category={cat}
                    selectedCategoryId={selectedCategory?.id ?? null}
                    onSelectCategory={handleSelectCategory}
                    onAddSubCategory={handleOpenAddModal}
                    onEditCategory={setEditCategoryTarget}
                    onDeleteCategory={setDeleteCategoryTarget}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal(null)}
            className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Opret kategori</span>
          </button>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 bg-primary rounded-xl border border-slate-800 p-6 shadow-sm min-h-[500px]">
          {selectedCategory ? (
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h1 className="text-2xl font-serif text-slate-100 font-semibold">
                    {selectedCategory.title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Kategori ID: {selectedCategory.id}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSelectMode ? (
                    <button
                      type="button"
                      onClick={exitSelectMode}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
                    >
                      <XIcon className="w-4 h-4" />
                      <span>Annullér</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSelectMode(true)}
                      disabled={aggregatedItems.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
                    >
                      <span>Vælg</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddItemsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tilføj items</span>
                  </button>
                </div>
              </div>

              {isSelectMode && selectedItemIds.size > 0 && (
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-sm text-slate-300">{selectedItemIds.size} valgt</span>
                  <button
                    type="button"
                    onClick={() => setIsDeleteItemsOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Slet valgte
                  </button>
                </div>
              )}

              {aggregatedItems.length > 0 ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                  {aggregatedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => (isSelectMode ? toggleItemSelected(item.id) : setSelectedItem(item))}
                      className="w-full flex items-center gap-3 justify-between p-4 bg-slate-900 hover:bg-slate-800/70 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(item.id)}
                            onChange={() => toggleItemSelected(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-950 text-[#C7975D] focus:ring-[#C7975D] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100 truncate">{item.name}</span>
                            {item.isFromSubCategory && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {item.sourceCategoryTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                        <span>Antal: {item.quantity}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.itemStatus}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 border border-dashed border-slate-800 rounded-lg bg-slate-900/50">
                  <Box className="w-12 h-12 mb-3 stroke-[1.5] text-slate-500" />
                  <p className="text-base font-medium text-slate-200">
                    Ingen items i denne kategori endnu
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Du kan stadig tilføje nye items
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Vælg en kategori i menuen til venstre
            </div>
          )}
        </div>
      </div>
    </div>
  );
}