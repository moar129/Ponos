import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetCategoryTreeQuery } from '../../store/apis/categoryApi';
import type { DataLayerCat, AggregatedItem, ItemLocation, ItemStatus } from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import { CategoryTreeNode } from '../../components/dataLayer/CategoriTreeNodeComponent';
import { AddCategoryComponent } from '../../components/dataLayer/addCategoryComponent';
import { AddItemsComponent } from '../../components/dataLayer/addItemsComponent';
import { ItemDetailComponent } from '../../components/dataLayer/itemsDetailComponent';
import { EditCategoryComponent } from '../../components/dataLayer/editCategoryComponent';
import { DeleteCategoryComponent } from '../../components/dataLayer/deleteCategoryComponent';
import { DeleteItemsComponent } from '../../components/dataLayer/deleteItemComponent';
import { FilterPanelComponent } from '../../components/dataLayer/filterPanelComponent';
import { LocationManagerComponent } from '../../components/dataLayer/locationsManagerComponent';
import { LocationItemsComponent } from '../../components/dataLayer/locationItemComponent';
import { GlobalSearchResultsComponent } from '../../components/dataLayer/globalSearchComponent';
import {
  getAggregatedItems,
  flattenAllItems,
  getDescendantCategories,
  searchCategories,
  searchItemsGlobal,
} from '../../store/slices/dataLayersSlices/aggregatedItems';
import { Search, Filter, Plus, Box, Loader2, Trash2, X as XIcon, MapPin } from 'lucide-react';


export function DataLayerPage() {
  const { data: categoryTree = [], isLoading, error } = useGetCategoryTreeQuery();

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('catId');

  const [selectedCategory, setSelectedCategory] = useState<DataLayerCat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  // Filter
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ItemStatus>>(new Set());
  const [selectedCategoryFilterIds, setSelectedCategoryFilterIds] = useState<Set<string>>(new Set());
  const [localItemSearch, setLocalItemSearch] = useState('');

  // Lokationer
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  const [locationItemsTarget, setLocationItemsTarget] = useState<ItemLocation | null>(null);

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

  const resetFilters = () => {
    setSelectedStatuses(new Set());
    setSelectedCategoryFilterIds(new Set());
  };

  const handleSelectCategory = (category: DataLayerCat) => {
    setSelectedCategory(category);
    setSearchParams({ catId: category.id });
    exitSelectMode();
    resetFilters();
    setLocalItemSearch('');
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

  const toggleStatusFilter = (status: ItemStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleCategoryFilter = (id: string) => {
    setSelectedCategoryFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenItemFromLocation = (item: AggregatedItem) => {
    setLocationItemsTarget(null);
    setIsLocationManagerOpen(false);
    setSelectedItem(item);
  };

  const handleSelectSearchCategory = (category: DataLayerCat) => {
    handleSelectCategory(category);
    setSearchQuery('');
  };

  const handleSelectSearchItem = (item: AggregatedItem) => {
    const itemCategory = findCategoryInTree(categoryTree, item.categoryId);
    if (itemCategory) {
      handleSelectCategory(itemCategory);
    }
    setSelectedItem(item);
    setSearchQuery('');
  };

  const errorMessage =
    error && typeof error === 'object' && 'error' in error
      ? (error as { error: string }).error
      : null;

  const aggregatedItems = useMemo(
    () => (selectedCategory ? getAggregatedItems(selectedCategory) : []),
    [selectedCategory]
  );

  const descendantCategories = useMemo(
    () => (selectedCategory ? getDescendantCategories(selectedCategory) : []),
    [selectedCategory]
  );

  const displayedItems = useMemo(
    () =>
      aggregatedItems.filter((item) => {
        if (selectedStatuses.size > 0 && !selectedStatuses.has(item.itemStatus as ItemStatus)) return false;
        if (selectedCategoryFilterIds.size > 0 && !selectedCategoryFilterIds.has(item.categoryId)) return false;

        if (localItemSearch.trim()) {
          const q = localItemSearch.trim().toLowerCase();
          const matches =
            item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);

          if (!matches) return false;
        }

        return true;
      }),
    [aggregatedItems, selectedStatuses, selectedCategoryFilterIds, localItemSearch]
  );

  const itemsMarkedForDeletion = useMemo(
    () => aggregatedItems.filter((item) => selectedItemIds.has(item.id)),
    [aggregatedItems, selectedItemIds]
  );

  const allItemsFlat = useMemo(() => flattenAllItems(categoryTree), [categoryTree]);

  const locationItems = useMemo(
    () =>
      locationItemsTarget
        ? allItemsFlat.filter((item) => item.itemLocationId === locationItemsTarget.id)
        : [],
    [allItemsFlat, locationItemsTarget]
  );

  const matchedCategories = useMemo(
    () => searchCategories(categoryTree, searchQuery),
    [categoryTree, searchQuery]
  );

  const matchedItems = useMemo(
    () => searchItemsGlobal(categoryTree, searchQuery),
    [categoryTree, searchQuery]
  );

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

      <LocationManagerComponent
        isOpen={isLocationManagerOpen}
        onClose={() => setIsLocationManagerOpen(false)}
        onViewItems={(loc) => setLocationItemsTarget(loc)}
      />

      <LocationItemsComponent
        isOpen={!!locationItemsTarget}
        location={locationItemsTarget}
        items={locationItems}
        onClose={() => setLocationItemsTarget(null)}
        onSelectItem={handleOpenItemFromLocation}
      />

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B132A] p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Søg efter item eller kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D] transition-colors"
          />
          <GlobalSearchResultsComponent
            isOpen={isSearchFocused && searchQuery.trim().length > 0}
            query={searchQuery}
            matchedCategories={matchedCategories}
            matchedItems={matchedItems}
            onSelectCategory={handleSelectSearchCategory}
            onSelectItem={handleSelectSearchItem}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsLocationManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            <MapPin className="w-4 h-4" />
            <span>Lokationer</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                selectedStatuses.size > 0 || selectedCategoryFilterIds.size > 0
                  ? 'bg-[#C7975D]/10 border-[#C7975D] text-[#C7975D]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {(selectedStatuses.size + selectedCategoryFilterIds.size) > 0 && (
                <span className="ml-1 text-xs bg-[#C7975D] text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {selectedStatuses.size + selectedCategoryFilterIds.size}
                </span>
              )}
            </button>

            <FilterPanelComponent
              isOpen={isFilterOpen}
              categories={descendantCategories}
              statuses={ALL_ITEM_STATUSES}
              selectedCategoryIds={selectedCategoryFilterIds}
              selectedStatuses={selectedStatuses}
              onToggleCategory={toggleCategoryFilter}
              onToggleStatus={toggleStatusFilter}
              onClear={resetFilters}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3 bg-[#0B132A] rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Kategorier
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
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
            className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Opret kategori</span>
          </button>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 bg-[#0B132A] rounded-xl border border-slate-800 p-6 shadow-sm min-h-[500px]">
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
                      disabled={displayedItems.length === 0}
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

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer items i denne kategori..."
                  value={localItemSearch}
                  onChange={(e) => setLocalItemSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C7975D] transition-colors"
                />
              </div>

             {isSelectMode && (
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-sm text-slate-300">{selectedItemIds.size} valgt</span>
                  <button
                    type="button"
                    onClick={() => setIsDeleteItemsOpen(true)}
                    disabled={selectedItemIds.size === 0}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedItemIds.size === 0
                        ? 'bg-red-600/20 text-red-400/50 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Slet valgte
                  </button>
                </div>
              )}

              {aggregatedItems.length > 0 && displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 border border-dashed border-slate-800 rounded-lg bg-slate-900/50">
                  <Filter className="w-10 h-10 mb-3 stroke-[1.5] text-slate-500" />
                  <p className="text-base font-medium text-slate-200">Ingen items matcher filtrene</p>
                  <button
                    type="button"
                    onClick={() => { resetFilters(); setLocalItemSearch(''); }}
                    className="text-xs text-[#C7975D] hover:text-[#e0ac6f] mt-2"
                  >
                    Ryd filtre
                  </button>
                </div>
              ) : displayedItems.length > 0 ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                  {displayedItems.map((item) => (
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
                        <span className="w-16 text-right">Antal: {item.quantity}</span>
                        <span className="w-24 text-center px-2 py-0.5 rounded bg-slate-800 text-slate-300">
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