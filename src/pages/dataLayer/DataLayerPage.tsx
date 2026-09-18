import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetCategoryTreeQuery, useUpdateCategoryMutation } from '../../store/apis/categoryApi';
import {
  CREATE_DATALAYER_PRIVILEGE,
  DELETE_DATALAYER_PRIVILEGE,
  READ_DATALAYER_PRIVILEGE,
  UPDATE_DATALAYER_PRIVILEGE,
  useHasPrivilege,
} from '../../store/apis/privilegeApi';
import type { DataLayerCat, AggregatedItem, ItemLocation, ItemStatus } from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES, ITEM_STATUS_STYLES, ITEM_STATUS_LABELS } from '../../types/dataLayer/datalayerTypes';
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
import { getErrorMessage } from '../../ErrorMessage';
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
  const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canRead, isLoading: loadingReadPrivilege } = useHasPrivilege(READ_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_DATALAYER_PRIVILEGE);

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('catId');

  const [selectedCategory, setSelectedCategory] = useState<DataLayerCat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addParentPath, setAddParentPath] = useState<string[] | undefined>(undefined);
  const [addNextRank, setAddNextRank] = useState(1);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [moveCategoryError, setMoveCategoryError] = useState<string | null>(null);
  const [isMovingCategory, setIsMovingCategory] = useState(false);
  const [updateCategory] = useUpdateCategoryMutation();

  const [editCategoryTarget, setEditCategoryTarget] = useState<DataLayerCat | null>(null);

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<DataLayerCat | null>(null);

  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<AggregatedItem | null>(null);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isDeleteItemsOpen, setIsDeleteItemsOpen] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ItemStatus>>(new Set());
  const [selectedCategoryFilterIds, setSelectedCategoryFilterIds] = useState<Set<string>>(new Set());
  const [localItemSearch, setLocalItemSearch] = useState('');

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

  function getCategoryPath(
    categories: DataLayerCat[],
    id: string
  ): DataLayerCat[] | null {
    for (const cat of categories) {
      if (cat.id === id) return [cat];
      if (cat.subCategories.length > 0) {
        const found = getCategoryPath(cat.subCategories, id);
        if (found) return [cat, ...found];
      }
    }
    return null;
  }

  const toggleExpandCategory = (id: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  function findSiblingsArray(
    categories: DataLayerCat[],
    id: string
  ): DataLayerCat[] | null {
    if (categories.some((cat) => cat.id === id)) return categories;
    for (const cat of categories) {
      const found = findSiblingsArray(cat.subCategories, id);
      if (found) return found;
    }
    return null;
  }

  const handleMoveCategory = async (category: DataLayerCat, direction: 'up' | 'down') => {
    if (isMovingCategory) return;

    const siblings = findSiblingsArray(categoryTree, category.id);
    if (!siblings) return;

    const idx = siblings.findIndex((cat) => cat.id === category.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const reordered = [...siblings];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];

    const updates = reordered
      .map((cat, i) => ({ id: cat.id, rank: i + 1, changed: cat.rank !== i + 1 }))
      .filter((update) => update.changed)
      .map(({ id, rank }) => ({ id, rank }));

    setIsMovingCategory(true);
    try {
      setMoveCategoryError(null);
      await Promise.all(updates.map((update) => updateCategory(update).unwrap()));
    } catch (err) {
      setMoveCategoryError(getErrorMessage(err, 'Kunne ikke flytte kategorien.'));
    } finally {
      setIsMovingCategory(false);
    }
  };

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
      const path = getCategoryPath(categoryTree, parentId);
      setAddParentPath(path?.map((cat) => cat.title));
      const parentCat = findCategoryInTree(categoryTree, parentId);
      setAddNextRank((parentCat?.subCategories.length ?? 0) + 1);
    } else {
      setAddParentPath(undefined);
      setAddNextRank(categoryTree.length + 1);
    }
    setIsAddModalOpen(true);
  };

  const handleCategoryAdded = (newCategoryId: string) => {
    if (addParentId) {
      const path = getCategoryPath(categoryTree, addParentId);
      if (path) {
        setExpandedCategoryIds((prev) => new Set([...prev, ...path.map((cat) => cat.id)]));
      }
    }
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

  const aggregatedItems = useMemo(() => {
    if (!selectedCategory) return [];
    const path = getCategoryPath(categoryTree, selectedCategory.id);
    const ancestorTitles = path ? path.slice(0, -1).map((c) => c.title) : [];
    return getAggregatedItems(selectedCategory, ancestorTitles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, categoryTree]);

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

  if (loadingReadPrivilege) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
        Du har ikke adgang til at se datalageret i denne organisation.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <AddCategoryComponent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        parentId={addParentId}
        parentPath={addParentPath}
        nextRank={addNextRank}
        onSuccess={handleCategoryAdded}
      />

      <EditCategoryComponent
        isOpen={!!editCategoryTarget}
        onClose={() => setEditCategoryTarget(null)}
        category={editCategoryTarget}
        categoryTree={categoryTree}
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
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      <ItemDetailComponent
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onViewLocation={(loc) => { setSelectedItem(null); setLocationItemsTarget(loc); }}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

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
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />

      <LocationItemsComponent
        isOpen={!!locationItemsTarget}
        location={locationItemsTarget}
        items={locationItems}
        onClose={() => setLocationItemsTarget(null)}
        onSelectItem={handleOpenItemFromLocation}
      />

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Toolbar: søgning + Lokationer/Filter. Stables lodret på mobil, wrapper på tablet, én linje fra lg. */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-border-gray shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div className="relative w-full lg:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
          <input
            type="text"
            placeholder="Søg efter item eller kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full bg-white border border-border-gray rounded-lg pl-10 pr-4 py-2 text-sm text-primary focus:outline-none focus:border-accent transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
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

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setIsLocationManagerOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Lagere</span>
          </button>

          <div className="relative flex-1 lg:flex-none">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                selectedStatuses.size > 0 || selectedCategoryFilterIds.size > 0
                  ? 'bg-accent/10 border-accent text-primary dark:text-slate-100'
                  : 'bg-bg-gray hover:bg-border-gray text-primary border-border-gray dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700'
              }`}
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span>Filter</span>
              {(selectedStatuses.size + selectedCategoryFilterIds.size) > 0 && (
                <span className="ml-1 text-xs bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
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

      {/* Hovedlayout: stables på mobil/tablet-portræt, splittes fra md */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        <div className="md:col-span-4 lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-border-gray p-3 sm:p-4 shadow-sm flex flex-col justify-between md:min-h-[500px] dark:bg-slate-800 dark:border-slate-700">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-gray dark:border-slate-700">
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider dark:text-slate-400">
                Kategorier
              </h2>
            </div>

            {moveCategoryError && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                {moveCategoryError}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] md:max-h-none overflow-y-auto">
                {categoryTree.map((cat, idx) => (
                  <CategoryTreeNode
                    key={cat.id}
                    category={cat}
                    selectedCategoryId={selectedCategory?.id ?? null}
                    onSelectCategory={handleSelectCategory}
                    onAddSubCategory={handleOpenAddModal}
                    onEditCategory={setEditCategoryTarget}
                    onDeleteCategory={setDeleteCategoryTarget}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    expandedCategoryIds={expandedCategoryIds}
                    onToggleExpand={toggleExpandCategory}
                    isFirst={idx === 0}
                    isLast={idx === categoryTree.length - 1}
                    isMoving={isMovingCategory}
                    onMoveUp={(c) => handleMoveCategory(c, 'up')}
                    onMoveDown={(c) => handleMoveCategory(c, 'down')}
                  />
                ))}
              </div>
            )}
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(null)}
              className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Opret kategori</span>
            </button>
          )}
        </div>

        <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-border-gray p-4 sm:p-6 shadow-sm md:min-h-[500px] dark:bg-slate-800 dark:border-slate-700">
          {selectedCategory ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-gray dark:border-slate-700">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-serif text-primary font-semibold truncate dark:text-slate-100">
                    {selectedCategory.title}
                  </h1>
                  <p className="text-xs text-secondary mt-1 truncate dark:text-slate-400">
                    Kategori ID: {selectedCategory.id}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canDelete && (isSelectMode ? (
                    <button
                      type="button"
                      onClick={exitSelectMode}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700"
                    >
                      <XIcon className="w-4 h-4" />
                      <span>Annullér</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSelectMode(true)}
                      disabled={displayedItems.length === 0}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700"
                    >
                      <span>Vælg til sletning</span>
                    </button>
                  ))}

                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => setIsAddItemsModalOpen(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tilføj items</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer items i denne kategori..."
                  value={localItemSearch}
                  onChange={(e) => setLocalItemSearch(e.target.value)}
                  className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-4 py-1.5 text-sm text-primary focus:outline-none focus:border-accent transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {isSelectMode && (
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-bg-gray/40 border border-border-gray gap-2 dark:bg-slate-800/40 dark:border-slate-700">
                  <span className="text-sm text-secondary shrink-0 dark:text-slate-400">{selectedItemIds.size} valgt</span>
                  <button
                    type="button"
                    onClick={() => setIsDeleteItemsOpen(true)}
                    disabled={selectedItemIds.size === 0}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                      selectedItemIds.size === 0
                        ? 'bg-red-100 text-red-300 cursor-not-allowed dark:bg-red-900/30 dark:text-red-800'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden xs:inline">Slet valgte</span>
                    <span className="xs:hidden">Slet</span>
                  </button>
                </div>
              )}

              {aggregatedItems.length > 0 && displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  <Filter className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
                  <p className="text-base font-medium text-primary dark:text-slate-100">Ingen items matcher filtrene</p>
                  <button
                    type="button"
                    onClick={() => { resetFilters(); setLocalItemSearch(''); }}
                    className="text-xs text-accent hover:text-accent-hover mt-2"
                  >
                    Ryd filtre
                  </button>
                </div>
              ) : displayedItems.length > 0 ? (
                <div className="divide-y divide-border-gray border border-border-gray rounded-lg overflow-hidden dark:divide-slate-700 dark:border-slate-700">
                  {displayedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => (isSelectMode ? toggleItemSelected(item.id) : setSelectedItem(item))}
                      className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:justify-between p-3 sm:p-4 bg-white hover:bg-bg-gray/40 text-left transition-colors dark:bg-slate-800 dark:hover:bg-slate-700/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedItemIds.has(item.id)}
                            onChange={() => toggleItemSelected(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-border-gray bg-white text-accent focus:ring-accent shrink-0 dark:border-slate-700 dark:bg-slate-800"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary truncate dark:text-slate-100">{item.name}</span>
                            {item.isFromSubCategory && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-bg-gray text-secondary dark:bg-slate-700 dark:text-slate-400">
                                {item.sourceCategoryTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary truncate mt-0.5 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Antal/status: på egen linje under navnet på mobil, ved siden af fra sm */}
                      <div className="flex items-center gap-3 shrink-0 text-sm text-secondary dark:text-slate-400">
                        <span className="sm:w-20 sm:text-right">Antal: {item.quantity}</span>
                        <span className={`sm:w-28 sm:text-center px-2 py-0.5 rounded border ${ITEM_STATUS_STYLES[item.itemStatus]}`}>
                          {ITEM_STATUS_LABELS[item.itemStatus]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  <Box className="w-12 h-12 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
                  <p className="text-base font-medium text-primary dark:text-slate-100">
                    Ingen items i denne kategori endnu
                  </p>
                  <p className="text-xs text-secondary mt-1 max-w-sm dark:text-slate-400">
                    Du kan stadig tilføje nye items
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-secondary text-sm py-12 dark:text-slate-400">
              Vælg en kategori i menuen til venstre
            </div>
          )}
        </div>
      </div>
    </div>
  );
}