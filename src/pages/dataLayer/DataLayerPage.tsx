import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom';
import { useGetCategoryTreeQuery, useUpdateCategoryMutation, useGetItemLocationsQuery } from '../../store/apis/categoryApi';
import {
  CREATE_DATALAYER_PRIVILEGE,
  DELETE_DATALAYER_PRIVILEGE,
  READ_DATALAYER_PRIVILEGE,
  UPDATE_DATALAYER_PRIVILEGE,
  useHasPrivilege,
} from '../../store/apis/privilegeApi';
import type { DataLayerCat, AggregatedItem, ItemLocation, ItemStatus } from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES, formatItemQuantity } from '../../types/dataLayer/datalayerTypes';
import { ItemStatusBadges } from '../../components/dataLayer/itemStatusBadgesComponent';
import { CategoryTreeNode } from '../../components/dataLayer/category/CategoriTreeNodeComponent';
import { LocationTreeNode } from '../../components/dataLayer/warehouse/locationThreeNodeComponent';
import { ItemLocationTag } from '../../components/dataLayer/warehouse/itemLocationTagComponent';
import { ItemCategoryTag } from '../../components/dataLayer/category/itemCategoryTagComponent';
import { AddCategoryComponent } from '../../components/dataLayer/category/addCategoryComponent';
import { AddLocationComponent } from '../../components/dataLayer/warehouse/addWarehouseComponent';
import { AddItemsComponent } from '../../components/dataLayer/item/addItemsComponent';
import { ItemDetailComponent } from '../../components/dataLayer/item/itemsDetailComponent';
import { EditCategoryComponent } from '../../components/dataLayer/category/editCategoryComponent';
import { EditLocationComponent } from '../../components/dataLayer/warehouse/editWarehouseComponent';
import { DeleteCategoryComponent } from '../../components/dataLayer/category/deleteCategoryComponent';
import { DeleteLocationComponent } from '../../components/dataLayer/warehouse/deleteWarehouseComponent';
import { DeleteItemsComponent } from '../../components/dataLayer/item/deleteItemComponent';
import { FilterPanelComponent } from '../../components/dataLayer/filterPanelComponent';
import { GlobalSearchResultsComponent } from '../../components/dataLayer/globalSearchComponent';
import { getErrorMessage } from '../../ErrorMessage';
import {
  getAggregatedItems,
  flattenAllItems,
  searchCategories,
  searchItemsGlobal,
} from '../../store/slices/dataLayersSlices/aggregatedItems';
import { Search, Filter, Plus, Box, Loader2, Trash2, X as XIcon, MapPin, Boxes } from 'lucide-react';

type LeftTab = 'categories' | 'locations';

// Inden for en filter-sektion: OR. Mellem sektioner: AND.
function itemMatchesFilters(item: AggregatedItem, statuses: Set<ItemStatus>, units: Set<string>): boolean {
  // US-42: et item matcher et statusfilter, hvis blot ÉN af dets
  // enheder/batches har den valgte status.
  if (statuses.size > 0 && ![...statuses].some((s) => (item.statusCounts[s] ?? 0) > 0)) return false;
  if (units.size > 0 && !units.has(item.unitOfMeasurement)) return false;
  return true;
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function DataLayerPage() {
  const { t } = useTranslation(['datalayer', 'common'])
  const { data: categoryTree = [], isLoading, error } = useGetCategoryTreeQuery();
  const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canRead, isLoading: loadingReadPrivilege } = useHasPrivilege(READ_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_DATALAYER_PRIVILEGE);
  const { data: itemLocations = [] } = useGetItemLocationsQuery();

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('catId');
  const locationIdFromUrl = searchParams.get('locId');
  const tabFromUrl = searchParams.get('tab');

  // Ændrer kun de givne URL-params; resten (fx valget i den anden fane) bevares.
  const updateParams = (patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  };

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
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [localItemSearch, setLocalItemSearch] = useState('');

  // --- Venstrepanel: Kategorier / Lager som faner ---
  // Fane + valgt lager/sektion læses fra URL'en, så F5/tilbage/delte links virker.
  // Lager er standard; et gammelt ?catId=-link uden tab åbner dog i Kategorier.
  const leftTab: LeftTab =
    tabFromUrl === 'categories' || tabFromUrl === 'locations'
      ? tabFromUrl
      : categoryIdFromUrl && !locationIdFromUrl
        ? 'categories'
        : 'locations';
  const [expandedWarehouseIds, setExpandedWarehouseIds] = useState<Set<string>>(new Set());
  const selectedLocationView = useMemo(
    () => (locationIdFromUrl ? itemLocations.find((l) => l.id === locationIdFromUrl) ?? null : null),
    [itemLocations, locationIdFromUrl]
  );

  // Lager: opret/rediger/slet - samme mønster som kategori-siden
  // (AddLocationComponent/EditLocationComponent/DeleteLocationComponent
  // er selvstændige fil-komponenter, 1:1 med Add/Edit/DeleteCategoryComponent).
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [addLocationParentId, setAddLocationParentId] = useState<string | null>(null);
  const [addLocationParentName, setAddLocationParentName] = useState<string | undefined>(undefined);
  const [editLocationTarget, setEditLocationTarget] = useState<ItemLocation | null>(null);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<ItemLocation | null>(null);

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      setMoveCategoryError(getErrorMessage(err, t('page.moveCategoryFailed')));
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
    setSelectedUnits(new Set());
  };

  // Filteret (status/enhed) nulstilles bevidst IKKE ved skift af fane,
  // kategori eller lager - man sætter det én gang og browser så rundt.
  const handleSwitchTab = (tab: LeftTab) => {
    updateParams({ tab });
    exitSelectMode();
    setLocalItemSearch('');
  };

  const handleSelectCategory = (category: DataLayerCat) => {
    setSelectedCategory(category);
    updateParams({ tab: 'categories', catId: category.id });
    exitSelectMode();
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
    updateParams({ tab: 'categories', catId: newCategoryId });
  };

  const handleCategoriesDeleted = (deletedIds: string[]) => {
    if (selectedCategory && deletedIds.includes(selectedCategory.id)) {
      setSelectedCategory(null);
      updateParams({ catId: null });
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

  const toggleStatusFilter = (status: ItemStatus) => setSelectedStatuses((prev) => toggleInSet(prev, status));
  const toggleUnitFilter = (unit: string) => setSelectedUnits((prev) => toggleInSet(prev, unit));

  // --- Lager-fane: navigations-træ + opret/rediger/slet ---
  const warehouses = useMemo(() => itemLocations.filter((l) => !l.parentLocationId), [itemLocations]);
  const sectionsByWarehouseId = useMemo(() => {
    const map = new Map<string, ItemLocation[]>();
    for (const loc of itemLocations) {
      if (!loc.parentLocationId) continue;
      const list = map.get(loc.parentLocationId) ?? [];
      list.push(loc);
      map.set(loc.parentLocationId, list);
    }
    return map;
  }, [itemLocations]);

  const toggleExpandWarehouse = (id: string) => {
    setExpandedWarehouseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectLocationView = (location: ItemLocation) => {
    updateParams({ tab: 'locations', locId: location.id });
    exitSelectMode();
    setLocalItemSearch('');
    if (location.parentLocationId) {
      setExpandedWarehouseIds((prev) => new Set([...prev, location.parentLocationId as string]));
    }
  };

  const handleOpenAddLocation = (parentId: string | null) => {
    setAddLocationParentId(parentId);
    if (parentId) {
      const parentWarehouse = itemLocations.find((l) => l.id === parentId);
      setAddLocationParentName(parentWarehouse?.name);
      setExpandedWarehouseIds((prev) => new Set([...prev, parentId]));
    } else {
      setAddLocationParentName(undefined);
    }
    setIsAddLocationModalOpen(true);
  };

  const handleLocationAdded = (newLocationId: string) => {
    // Vises først i listen, når useGetItemLocationsQuery er blevet
    // invalideret/genhentet (sker automatisk via invalidatesTags).
    const parent = addLocationParentId
      ? itemLocations.find((l) => l.id === addLocationParentId)
      : null;
    if (parent) {
      setExpandedWarehouseIds((prev) => new Set([...prev, parent.id]));
    }
    // selectedLocationView afledes af URL'en og dukker op, når refetch er færdig.
    updateParams({ tab: 'locations', locId: newLocationId });
  };

  const handleLocationDeleted = (deletedId: string) => {
    if (locationIdFromUrl === deletedId) {
      updateParams({ locId: null });
    }
  };

  const handleOpenItemFromLocation = (item: AggregatedItem) => {
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

  const handleSelectSearchLocation = (location: ItemLocation) => {
    handleSelectLocationView(location);
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

  const allItemsFlat = useMemo(() => flattenAllItems(categoryTree), [categoryTree]);

  // Et lager viser også indholdet af alle sine sektioner; en sektion kun sit eget.
  const itemsAtSelectedLocation = useMemo(() => {
    if (!selectedLocationView) return [];
    const locationIds = new Set([selectedLocationView.id]);
    if (!selectedLocationView.parentLocationId) {
      for (const section of sectionsByWarehouseId.get(selectedLocationView.id) ?? []) {
        locationIds.add(section.id);
      }
    }
    return allItemsFlat.filter((item) => item.itemLocationId && locationIds.has(item.itemLocationId));
  }, [allItemsFlat, selectedLocationView, sectionsByWarehouseId]);

  const locationsById = useMemo(
    () => new Map(itemLocations.map((loc) => [loc.id, loc])),
    [itemLocations]
  );

  // --- Filter: status + enhed, fælles for begge faner og bevaret på
  // tværs af kategori/lager-skift. Kategori/lager vælges i træet til
  // venstre, ikke i filteret. Enheder hentes fra ALLE orgens items, så en
  // valgt enhed ikke forsvinder fra listen i en visning uden den enhed.
  const filterUnits = useMemo(
    () => Array.from(new Set(allItemsFlat.map((item) => item.unitOfMeasurement))).sort(),
    [allItemsFlat]
  );

  const activeFilterCount = selectedStatuses.size + selectedUnits.size;

  const displayedItems = useMemo(
    () =>
      aggregatedItems.filter((item) => {
        if (!itemMatchesFilters(item, selectedStatuses, selectedUnits)) return false;

        if (localItemSearch.trim()) {
          const q = localItemSearch.trim().toLowerCase();
          const matches =
            item.name.toLowerCase().includes(q) ||
            (item.description ?? '').toLowerCase().includes(q) ||
            (item.packaging ?? '').toLowerCase().includes(q);

          if (!matches) return false;
        }

        return true;
      }),
    [aggregatedItems, selectedStatuses, selectedUnits, localItemSearch]
  );

  // Samme filtrering som kategori-panelet, bare på items for den valgte
  // lokation i stedet for den valgte kategori.
  const displayedLocationItems = useMemo(() => {
    if (!selectedLocationView) return [];
    const q = localItemSearch.trim().toLowerCase();
    return itemsAtSelectedLocation.filter((item) => {
      if (!itemMatchesFilters(item, selectedStatuses, selectedUnits)) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);
    });
  }, [itemsAtSelectedLocation, selectedLocationView, selectedStatuses, selectedUnits, localItemSearch]);

  // "Vælg til sletning" deler samme select-state på tværs af de to faner
  // (kun én er synlig ad gangen), men kilden til de markerede items
  // afhænger af hvilken fane man står i.
  const itemsMarkedForDeletion = useMemo(() => {
    const source = leftTab === 'locations' ? itemsAtSelectedLocation : aggregatedItems;
    return source.filter((item) => selectedItemIds.has(item.id));
  }, [leftTab, aggregatedItems, itemsAtSelectedLocation, selectedItemIds]);

  const matchedCategories = useMemo(
    () => searchCategories(categoryTree, searchQuery),
    [categoryTree, searchQuery]
  );

  const matchedItems = useMemo(
    () => searchItemsGlobal(categoryTree, searchQuery),
    [categoryTree, searchQuery]
  );

  const matchedLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return itemLocations.filter((loc) => loc.name.toLowerCase().includes(q));
  }, [itemLocations, searchQuery]);

  // Selve locations-objektet for det slette-mål, samt antal sektioner
  // hvis det er et lager - bruges af DeleteLocationComponent til
  // cascade-advarslen.
  const deleteLocationSectionCount = deleteLocationTarget && !deleteLocationTarget.parentLocationId
    ? (sectionsByWarehouseId.get(deleteLocationTarget.id)?.length ?? 0)
    : 0;

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
        {t('noAccess')}
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

      <AddLocationComponent
        isOpen={isAddLocationModalOpen}
        onClose={() => setIsAddLocationModalOpen(false)}
        parentId={addLocationParentId}
        parentName={addLocationParentName}
        onSuccess={handleLocationAdded}
      />

      <EditLocationComponent
        isOpen={!!editLocationTarget}
        onClose={() => setEditLocationTarget(null)}
        location={editLocationTarget}
      />

      <DeleteLocationComponent
        isOpen={!!deleteLocationTarget}
        location={deleteLocationTarget}
        sectionCount={deleteLocationSectionCount}
        onClose={() => setDeleteLocationTarget(null)}
        onDeleted={handleLocationDeleted}
      />

      <AddItemsComponent
        isOpen={isAddItemsModalOpen}
        onClose={() => setIsAddItemsModalOpen(false)}
        categoryTree={categoryTree}
        categoryId={leftTab === 'locations' ? null : (selectedCategory?.id ?? null)}
        categoryTitle={leftTab === 'locations' ? undefined : selectedCategory?.title}
        canCreate={canCreate}
      />

      <ItemDetailComponent
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onViewLocation={(loc) => { setSelectedItem(null); handleSelectLocationView(loc); }}
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

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Toolbar: global søgning (item/kategori/lager/sektion) + Filter */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-border-gray shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div className="relative w-full lg:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
          <input
            type="text"
            placeholder={t('page.searchPlaceholder')}
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
            matchedLocations={matchedLocations}
            allLocations={itemLocations}
            onSelectCategory={handleSelectSearchCategory}
            onSelectItem={handleSelectSearchItem}
            onSelectLocation={handleSelectSearchLocation}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                activeFilterCount > 0
                  ?'bg-accent/10 border-accent text-primary dark:text-slate-100'
                  : 'bg-bg-gray hover:bg-border-gray text-primary border-border-gray dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700'
              }`}
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span>{t('page.filter')}</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 text-xs bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <FilterPanelComponent
              isOpen={isFilterOpen}
              statuses={ALL_ITEM_STATUSES}
              selectedStatuses={selectedStatuses}
              onToggleStatus={toggleStatusFilter}
              units={filterUnits}
              selectedUnits={selectedUnits}
              onToggleUnit={toggleUnitFilter}
              onClear={resetFilters}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Hovedlayout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        <div className="md:col-span-4 lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-border-gray p-3 sm:p-4 shadow-sm flex flex-col justify-between md:min-h-[500px] dark:bg-slate-800 dark:border-slate-700">
          <div className="min-h-0 flex flex-col">
            {/* Fane-skifter */}
            <div className="flex items-center border-b border-border-gray mb-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSwitchTab('locations')}
                className={`flex-1 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  leftTab === 'locations'
                    ? 'text-accent border-accent'
                    : 'text-secondary border-transparent hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t('page.locations')}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('categories')}
                className={`flex-1 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  leftTab === 'categories'
                    ? 'text-accent border-accent'
                    : 'text-secondary border-transparent hover:text-primary dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {t('categories')}
              </button>
            </div>

            {leftTab === 'categories' ? (
              <>
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
              </>
            ) : (
              // Lager: navigations-træ + opret/rediger/slet, med samme
              // rettigheder (canCreate/canUpdate/canDelete) som
              // kategori-fanen - IKKE længere hardcodet til false.
              <div className="max-h-[300px] md:max-h-none overflow-y-auto space-y-1">
                {warehouses.length === 0 ? (
                  <p className="text-sm text-secondary text-center py-8 dark:text-slate-400">{t('locations.empty')}</p>
                ) : (
                  warehouses.map((warehouse) => (
                    <LocationTreeNode
                      key={warehouse.id}
                      location={warehouse}
                      childSections={sectionsByWarehouseId.get(warehouse.id) ?? []}
                      isWarehouse
                      selectedLocationId={selectedLocationView?.id ?? null}
                      onSelectLocation={handleSelectLocationView}
                      onAddSection={(warehouseId) => handleOpenAddLocation(warehouseId)}
                      onEditLocation={setEditLocationTarget}
                      onDeleteLocation={setDeleteLocationTarget}
                      canCreate={canCreate}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      isExpanded={
                        expandedWarehouseIds.has(warehouse.id) ||
                        selectedLocationView?.parentLocationId === warehouse.id
                      }
                      onToggleExpand={toggleExpandWarehouse}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {leftTab === 'categories' && canCreate && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(null)}
              className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('page.createCategory')}</span>
            </button>
          )}

          {leftTab === 'locations' && canCreate && (
            <button
              type="button"
              onClick={() => handleOpenAddLocation(null)}
              className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('locations.createWarehouseButton')}</span>
            </button>
          )}
        </div>

        <div className="md:col-span-8 lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-border-gray p-4 sm:p-6 shadow-sm md:min-h-[500px] dark:bg-slate-800 dark:border-slate-700">
          {leftTab === 'locations' ? (
            selectedLocationView ? (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-gray dark:border-slate-700">
                  <div className="min-w-0">
  <div className="flex items-center gap-2 mb-1">
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
      selectedLocationView.parentLocationId
        ? 'bg-accent/10 text-accent border-accent/30'
        : 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
    }`}>
      {selectedLocationView.parentLocationId ? t('locations.section') : t('locations.warehouse')}
    </span>
    {selectedLocationView.parentLocationId && (() => {
      const parentWarehouse = itemLocations.find((l) => l.id === selectedLocationView.parentLocationId);
      return parentWarehouse ? (
        <button
          type="button"
          onClick={() => handleSelectLocationView(parentWarehouse)}
          className="text-xs text-secondary hover:text-accent hover:underline truncate dark:text-slate-400"
        >
          {parentWarehouse.name}
        </button>
      ) : null;
    })()}
  </div>
  <div className="flex items-center gap-2">
    {selectedLocationView.parentLocationId ? (
      <Boxes className="w-5 h-5 text-accent shrink-0" />
    ) : (
      <MapPin className="w-5 h-5 text-accent shrink-0" />
    )}
    <h1 className="text-xl sm:text-2xl font-serif text-primary font-semibold truncate dark:text-slate-100">
      {selectedLocationView.name}
    </h1>
  </div>
  {selectedLocationView.address && (
    <p className="text-xs text-secondary mt-1 dark:text-slate-400">{selectedLocationView.address}</p>
  )}
</div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canDelete && (isSelectMode ? (
                      <button
                        type="button"
                        onClick={exitSelectMode}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700"
                      >
                        <XIcon className="w-4 h-4" />
                        <span>{t('common:cancel')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSelectMode(true)}
                        disabled={displayedLocationItems.length === 0}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700"
                      >
                        <span>{t('page.selectForDeletion')}</span>
                      </button>
                    ))}

                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => setIsAddItemsModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t('page.addItems')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder={t('page.filterItemsAtLocationPlaceholder')}
                    value={localItemSearch}
                    onChange={(e) => setLocalItemSearch(e.target.value)}
                    className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-4 py-1.5 text-sm text-primary focus:outline-none focus:border-accent transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>

                {isSelectMode && (
                  <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-bg-gray/40 border border-border-gray gap-2 dark:bg-slate-800/40 dark:border-slate-700">
                    <span className="text-sm text-secondary shrink-0 dark:text-slate-400">{t('common:selectedCount', { count: selectedItemIds.size })}</span>
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
                      <span className="hidden xs:inline">{t('page.deleteSelected')}</span>
                      <span className="xs:hidden">{t('page.deleteShort')}</span>
                    </button>
                  </div>
                )}

                {itemsAtSelectedLocation.length > 0 && displayedLocationItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                    <Filter className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
                    <p className="text-base font-medium text-primary dark:text-slate-100">{t('page.noItemsMatch')}</p>
                    <button
                      type="button"
                      onClick={() => { resetFilters(); setLocalItemSearch(''); }}
                      className="text-xs text-accent hover:text-accent-hover mt-2"
                    >
                      {t('page.clearFilters')}
                    </button>
                  </div>
                ) : displayedLocationItems.length > 0 ? (
                  <div className="divide-y divide-border-gray border border-border-gray rounded-lg overflow-hidden dark:divide-slate-700 dark:border-slate-700">
                    {displayedLocationItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => (isSelectMode ? toggleItemSelected(item.id) : handleOpenItemFromLocation(item))}
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
                            <span className="font-medium text-primary truncate dark:text-slate-100">{item.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-xs text-secondary dark:text-slate-400">
                              <ItemLocationTag locationId={item.itemLocationId} locationsById={locationsById} />
                              <span className="shrink-0">·</span>
                              <ItemCategoryTag categoryPath={item.sourceCategoryTitle} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-sm text-secondary dark:text-slate-400">
                          <span className="sm:w-20 sm:text-right">{formatItemQuantity(item)}</span>
                          <ItemStatusBadges item={item} className="sm:w-40" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                    <Box className="w-12 h-12 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
                    <p className="text-base font-medium text-primary dark:text-slate-100">
                      {t('page.noItemsAtLocationYet')}
                    </p>
                    <p className="text-xs text-secondary mt-1 max-w-sm dark:text-slate-400">
                      {t('page.canStillAdd')}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-secondary text-sm py-12 dark:text-slate-400">
                {t('locations.chooseInTree')}
              </div>
            )
          ) : selectedCategory ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-gray dark:border-slate-700">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-serif text-primary font-semibold truncate dark:text-slate-100">
                    {selectedCategory.title}
                  </h1>
                  <p className="text-xs text-secondary mt-1 truncate dark:text-slate-400">
                    {t('categoryIdValue', { id: selectedCategory.id })}
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
                      <span>{t('common:cancel')}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSelectMode(true)}
                      disabled={displayedItems.length === 0}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-bg-gray hover:bg-border-gray text-primary text-sm font-medium transition-colors border border-border-gray disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700"
                    >
                      <span>{t('page.selectForDeletion')}</span>
                    </button>
                  ))}

                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => setIsAddItemsModalOpen(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('page.addItems')}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-slate-400" />
                <input
                  type="text"
                  placeholder={t('page.filterItemsPlaceholder')}
                  value={localItemSearch}
                  onChange={(e) => setLocalItemSearch(e.target.value)}
                  className="w-full bg-white border border-border-gray rounded-lg pl-9 pr-4 py-1.5 text-sm text-primary focus:outline-none focus:border-accent transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {isSelectMode && (
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-bg-gray/40 border border-border-gray gap-2 dark:bg-slate-800/40 dark:border-slate-700">
                  <span className="text-sm text-secondary shrink-0 dark:text-slate-400">{t('common:selectedCount', { count: selectedItemIds.size })}</span>
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
                    <span className="hidden xs:inline">{t('page.deleteSelected')}</span>
                    <span className="xs:hidden">{t('page.deleteShort')}</span>
                  </button>
                </div>
              )}

              {aggregatedItems.length > 0 && displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  <Filter className="w-10 h-10 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
                  <p className="text-base font-medium text-primary dark:text-slate-100">{t('page.noItemsMatch')}</p>
                  <button
                    type="button"
                    onClick={() => { resetFilters(); setLocalItemSearch(''); }}
                    className="text-xs text-accent hover:text-accent-hover mt-2"
                  >
                    {t('page.clearFilters')}
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
                          <span className="font-medium text-primary truncate dark:text-slate-100">{item.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-xs text-secondary dark:text-slate-400">
                            <ItemLocationTag locationId={item.itemLocationId} locationsById={locationsById} />
                            <span className="shrink-0">·</span>
                            <ItemCategoryTag categoryPath={item.sourceCategoryTitle} />
                            {item.description && (
                              <>
                                <span className="shrink-0">·</span>
                                <span className="truncate">{item.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-sm text-secondary dark:text-slate-400">
                        <span className="sm:w-20 sm:text-right">{formatItemQuantity(item)}</span>
                        <ItemStatusBadges item={item} className="sm:w-40" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-secondary border border-dashed border-border-gray rounded-lg bg-bg-gray/30 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  <Box className="w-12 h-12 mb-3 stroke-[1.5] text-secondary dark:text-slate-400" />
                  <p className="text-base font-medium text-primary dark:text-slate-100">
                    {t('page.noItemsInCategory')}
                  </p>
                  <p className="text-xs text-secondary mt-1 max-w-sm dark:text-slate-400">
                    {t('page.canStillAdd')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-secondary text-sm py-12 dark:text-slate-400">
              {t('page.chooseCategory')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}