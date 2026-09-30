import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom';
import {
  useGetCategoryTreeQuery,
  useUpdateCategoryMutation,
  useGetItemLocationsQuery,
  useGetUnitLocationCountsQuery,
} from '../../store/apis/categoryApi';
import {
  CREATE_DATALAYER_PRIVILEGE,
  DELETE_DATALAYER_PRIVILEGE,
  READ_DATALAYER_PRIVILEGE,
  UPDATE_DATALAYER_PRIVILEGE,
  useHasPrivilege,
} from '../../store/apis/privilegeApi';
import {
  useGetDataLayerFavoritesQuery,
  useAddDataLayerFavoriteMutation,
  useRemoveDataLayerFavoriteMutation,
} from '../../store/apis/dataLayerFavoriteApi';
import type {
  DataLayerCat,
  DataLayerFavorite,
  DataLayerFavoriteTarget,
  FavoriteEntry,
  AggregatedItem,
  ItemLocation,
  ItemStatus,
  SummaryChip,
  UnitLocationCount,
} from '../../types/dataLayer/datalayerTypes';
import { ALL_ITEM_STATUSES } from '../../types/dataLayer/datalayerTypes';
import { CategoryTreeNode } from '../../components/dataLayer/category/CategoriTreeNodeComponent';
import { LocationTreeNode } from '../../components/dataLayer/warehouse/locationThreeNodeComponent';
import { AddCategoryComponent } from '../../components/dataLayer/category/addCategoryComponent';
import { AddItemsComponent } from '../../components/dataLayer/item/addItemsComponent';
import { ItemDetailComponent } from '../../components/dataLayer/item/itemsDetailComponent';
import { EditCategoryComponent } from '../../components/dataLayer/category/editCategoryComponent';
import { LocationFormModal } from '../../components/dataLayer/warehouse/LocationFormModal';
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
import {
  buildPlacementIndex,
  getPlacements,
  scopeItemToLocations,
  summarizeByCategory,
  summarizeByLocation,
} from '../../store/slices/dataLayersSlices/itemPlacements';
import { FavoritesSection } from '../../components/dataLayer/favorites/favoritesSectionComponent';
import { FavoriteStarButton } from '../../components/common/FavoriteStarButton';
import { Search, Filter, Plus, Loader2, MapPin, Boxes } from 'lucide-react';
import { joinPath, locationPathLabel } from '../../utils/locationPathLabel';
import { toggleInSet } from '../../utils/toggle';
import { findCategoryInTree, findSiblings, getCategoryPath } from '../../store/slices/dataLayersSlices/aggregatedItems';
import { LocationKindBadge } from '../../components/dataLayer/warehouse/LocationKindBadge';
import { ItemListPanel } from '../../components/dataLayer/item/ItemListPanel';
import { Alert } from '../../components/common/Alert';

type LeftTab = 'categories' | 'locations';

// Stabil reference, så placementIndex ikke genberegnes hver render mens query'en loader.
const EMPTY_TREE: DataLayerCat[] = [];
const EMPTY_LOCATIONS: ItemLocation[] = [];
const EMPTY_UNIT_COUNTS: UnitLocationCount[] = [];
const EMPTY_FAVORITES: DataLayerFavorite[] = [];

// Inden for en filter-sektion: OR. Mellem sektioner: AND.
function itemMatchesFilters(item: AggregatedItem, statuses: Set<ItemStatus>, units: Set<string>, search: string): boolean {
  // US-42: et item matcher et statusfilter, hvis blot ÉN af dets
  // enheder/batches har den valgte status.
  if (statuses.size > 0 && ![...statuses].some((s) => (item.statusCounts[s] ?? 0) > 0)) return false;
  if (units.size > 0 && !units.has(item.unitOfMeasurement)) return false;
  const q = search.trim().toLowerCase();
  return !q || [item.name, item.description, item.packaging].some((value) => (value ?? '').toLowerCase().includes(q));
}


export function DataLayerPage() {
  const { t } = useTranslation(['datalayer', 'common'])
  const { data: categoryTree = EMPTY_TREE, isLoading, error } = useGetCategoryTreeQuery();
  const { hasPrivilege: canCreate } = useHasPrivilege(CREATE_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canRead, isLoading: loadingReadPrivilege } = useHasPrivilege(READ_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canUpdate } = useHasPrivilege(UPDATE_DATALAYER_PRIVILEGE);
  const { hasPrivilege: canDelete } = useHasPrivilege(DELETE_DATALAYER_PRIVILEGE);
  const { data: itemLocations = EMPTY_LOCATIONS } = useGetItemLocationsQuery();
  const { data: unitLocationCounts = EMPTY_UNIT_COUNTS, error: unitCountsError } = useGetUnitLocationCountsQuery();
  const { data: favorites = EMPTY_FAVORITES } = useGetDataLayerFavoritesQuery(undefined, { skip: !canRead });
  const [addFavorite] = useAddDataLayerFavoriteMutation();
  const [removeFavorite] = useRemoveDataLayerFavoriteMutation();
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

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

  // Fold forælder-lageret ud én gang pr. ny valgt lokation (også ved F5/delt
  // link), men lad brugeren kollapse det bagefter.
  const [revealedLocationId, setRevealedLocationId] = useState<string | null>(null);
  if (selectedLocationView && selectedLocationView.id !== revealedLocationId) {
    setRevealedLocationId(selectedLocationView.id);
    const parentId = selectedLocationView.parentLocationId;
    if (parentId) setExpandedWarehouseIds((prev) => new Set([...prev, parentId]));
  }

  // Lager: opret/rediger/slet - samme mønster som kategori-siden
  // (AddLocationComponent/EditLocationComponent/DeleteLocationComponent
  // er selvstændige fil-komponenter, 1:1 med Add/Edit/DeleteCategoryComponent).
  // undefined = lukket, null = nyt lager, ellers lageret en ny sektion skal under.
  const [addLocationParent, setAddLocationParent] = useState<ItemLocation | null | undefined>(undefined);
  const [editLocationTarget, setEditLocationTarget] = useState<ItemLocation | null>(null);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<ItemLocation | null>(null);

  const toggleExpandCategory = (id: string) => setExpandedCategoryIds((prev) => toggleInSet(prev, id));

  const handleMoveCategory = async (category: DataLayerCat, direction: 'up' | 'down') => {
    if (isMovingCategory) return;

    const siblings = findSiblings(categoryTree, category.id);
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

  // Den valgte kategori læses fra URL'en (?catId=) - ukendt eller ingen
  // falder tilbage til den første. Afledt, så den altid er den friske
  // version fra træet efter en ændring.
  const selectedCategory: DataLayerCat | null =
    (categoryIdFromUrl ? findCategoryInTree(categoryTree, categoryIdFromUrl) : null) ?? categoryTree[0] ?? null;

  const allItemsFlat = useMemo(() => flattenAllItems(categoryTree), [categoryTree]);

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
      updateParams({ catId: null });
    }
  };

  const toggleItemSelected = (id: string) => setSelectedItemIds((prev) => toggleInSet(prev, id));

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

  const toggleExpandWarehouse = (id: string) => setExpandedWarehouseIds((prev) => toggleInSet(prev, id));

  const handleSelectLocationView = (location: ItemLocation) => {
    updateParams({ tab: 'locations', locId: location.id });
    exitSelectMode();
    setLocalItemSearch('');
    if (location.parentLocationId) {
      setExpandedWarehouseIds((prev) => new Set([...prev, location.parentLocationId as string]));
    }
  };

  // --- Favoritter: personlige stjernemarkeringer øverst i hver fane ---
  const favoriteCategoryIds = useMemo(
    () => new Set(favorites.flatMap((fav) => (fav.categoryId ? [fav.categoryId] : []))),
    [favorites]
  );
  const favoriteLocationIds = useMemo(
    () => new Set(favorites.flatMap((fav) => (fav.locationId ? [fav.locationId] : []))),
    [favorites]
  );

  const toggleFavorite = async (target: DataLayerFavoriteTarget, isFavorite: boolean) => {
    setFavoriteError(null);
    try {
      if (isFavorite) await removeFavorite(target).unwrap();
      else await addFavorite(target).unwrap();
    } catch (err) {
      setFavoriteError(getErrorMessage(err, t('favorites.toggleFailed')));
    }
  };

  const handleToggleCategoryFavorite = (id: string) =>
    toggleFavorite({ categoryId: id }, favoriteCategoryIds.has(id));
  const handleToggleLocationFavorite = (id: string) =>
    toggleFavorite({ locationId: id }, favoriteLocationIds.has(id));

  // Favoritter hvis mål ikke (længere) findes i træet udelades - fx mens
  // træet loader, eller hvis kategorien lige er slettet (cascade fjerner
  // rækken i DB, refetch følger).
  // Vælger kategorien og folder dens forfædre ud i træet, så den kan ses dér.
  const selectCategoryAndReveal = (category: DataLayerCat) => {
    const path = getCategoryPath(categoryTree, category.id) ?? [];
    setExpandedCategoryIds((prev) => new Set([...prev, ...path.slice(0, -1).map((cat) => cat.id)]));
    handleSelectCategory(category);
  };

  // Undergrupper gemmes ikke som favoritter - de vises foldbart under
  // favoritten, så nye underkategorier automatisk kommer med.
  const buildCategoryChildEntries = (category: DataLayerCat, parentKey: string): FavoriteEntry[] =>
    category.subCategories.map((sub) => {
      const key = `${parentKey}/${sub.id}`;
      return {
        key,
        label: sub.title,
        isSelected: selectedCategory?.id === sub.id,
        onSelect: () => selectCategoryAndReveal(sub),
        children: buildCategoryChildEntries(sub, key),
      };
    });

  const categoryFavoriteEntries: FavoriteEntry[] = [...favoriteCategoryIds]
    .flatMap((id) => {
      const path = getCategoryPath(categoryTree, id);
      if (!path) return [];
      const category = path[path.length - 1];
      return [{
        key: id,
        label: joinPath(path.map((cat) => cat.title)),
        isSelected: selectedCategory?.id === id,
        onSelect: () => selectCategoryAndReveal(category),
        onRemove: () => handleToggleCategoryFavorite(id),
        children: buildCategoryChildEntries(category, id),
      }];
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const locationFavoriteEntries: FavoriteEntry[] = [...favoriteLocationIds]
    .flatMap((id) => {
      const location = itemLocations.find((l) => l.id === id);
      if (!location) return [];
      return [{
        key: id,
        label: locationPathLabel(location, itemLocations),
        isSelected: selectedLocationView?.id === id,
        onSelect: () => handleSelectLocationView(location),
        onRemove: () => handleToggleLocationFavorite(id),
        children: (sectionsByWarehouseId.get(id) ?? []).map((section) => ({
          key: `${id}/${section.id}`,
          label: section.name,
          isSelected: selectedLocationView?.id === section.id,
          onSelect: () => handleSelectLocationView(section),
          children: [],
        })),
      }];
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleOpenAddLocation = (parentId: string | null) => {
    if (parentId) setExpandedWarehouseIds((prev) => new Set([...prev, parentId]));
    setAddLocationParent(parentId ? itemLocations.find((l) => l.id === parentId) ?? null : null);
  };

  const handleLocationAdded = (newLocationId: string) => {
    // Vises først i listen, når useGetItemLocationsQuery er blevet
    // invalideret/genhentet (sker automatisk via invalidatesTags).
    // selectedLocationView afledes af URL'en og dukker op, når refetch er færdig.
    updateParams({ tab: 'locations', locId: newLocationId });
  };

  const handleLocationDeleted = (deletedId: string) => {
    if (locationIdFromUrl === deletedId) {
      updateParams({ locId: null });
    }
  };

  // Detaljevisningen skal vise hele item'et, ikke kun den del der ligger her.
  const handleOpenItemFromLocation = (item: AggregatedItem) => {
    setSelectedItem(allItemsFlat.find((i) => i.id === item.id) ?? item);
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

  const loadError = error ?? unitCountsError;
  const errorMessage =
    loadError && typeof loadError === 'object' && 'error' in loadError
      ? (loadError as { error: string }).error
      : null;

  const aggregatedItems = useMemo(() => {
    if (!selectedCategory) return [];
    const path = getCategoryPath(categoryTree, selectedCategory.id);
    const ancestorTitles = path ? path.slice(0, -1).map((c) => c.title) : [];
    return getAggregatedItems(selectedCategory, ancestorTitles);
  }, [selectedCategory, categoryTree]);

  // Placering er pr. enhed - et item kan ligge flere steder. Mens counts
  // loader, falder hvert item tilbage til sin egen location_id.
  const placementIndex = useMemo(
    () => buildPlacementIndex(unitLocationCounts, allItemsFlat),
    [unitLocationCounts, allItemsFlat]
  );

  // Et lager viser også indholdet af alle sine sektioner; en sektion kun sit eget.
  const selectedLocationIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedLocationView) return ids;
    ids.add(selectedLocationView.id);
    if (!selectedLocationView.parentLocationId) {
      for (const section of sectionsByWarehouseId.get(selectedLocationView.id) ?? []) {
        ids.add(section.id);
      }
    }
    return ids;
  }, [selectedLocationView, sectionsByWarehouseId]);

  // Antal/status i lager-visningen er kun det, der ligger på den valgte lokation.
  const itemsAtSelectedLocation = useMemo(
    () =>
      allItemsFlat.flatMap((item) => {
        const scoped = scopeItemToLocations(item, getPlacements(placementIndex, item.id), selectedLocationIds);
        return scoped ? [scoped] : [];
      }),
    [allItemsFlat, placementIndex, selectedLocationIds]
  );

  const locationsById = useMemo(
    () => new Map(itemLocations.map((loc) => [loc.id, loc])),
    [itemLocations]
  );

  // Placeringer til række-tag; kendte lokationer før "Intet lager".
  const placementIdsFor = (itemId: string, within?: Set<string>): (string | null)[] =>
    getPlacements(placementIndex, itemId)
      .map((p) => p.locationId)
      .filter((id) => !within || (id !== null && within.has(id)))
      .sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0));

  const locationChipLabel = (location: ItemLocation): string => locationPathLabel(location, locationsById);

  // Chips over listen: kategorier i lager-visningen, placeringer i kategori-visningen.
  const categoryChips = useMemo<SummaryChip[]>(
    () =>
      summarizeByCategory(itemsAtSelectedLocation).map((summary) => ({
        id: summary.categoryId,
        label: summary.path,
        count: summary.itemCount,
        kind: 'category',
        onNavigate: () => {
          const category = findCategoryInTree(categoryTree, summary.categoryId);
          if (category) handleSelectCategory(category);
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemsAtSelectedLocation, categoryTree]
  );

  const locationChips = useMemo<SummaryChip[]>(
    () =>
      summarizeByLocation(aggregatedItems, placementIndex)
        .flatMap((summary): SummaryChip[] => {
          if (summary.locationId === null) {
            return [{ id: 'none', label: t('itemDetail.noLocation'), count: summary.itemCount, kind: 'none' }];
          }
          const location = locationsById.get(summary.locationId);
          if (!location) return [];
          return [{
            id: location.id,
            label: locationChipLabel(location),
            count: summary.itemCount,
            kind: location.parentLocationId ? 'section' : 'warehouse',
            onNavigate: () => handleSelectLocationView(location),
          }];
        })
        .sort((a, b) => (a.kind === 'none' ? 1 : 0) - (b.kind === 'none' ? 1 : 0) || a.label.localeCompare(b.label)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggregatedItems, placementIndex, locationsById, t]
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
    () => aggregatedItems.filter((item) => itemMatchesFilters(item, selectedStatuses, selectedUnits, localItemSearch)),
    [aggregatedItems, selectedStatuses, selectedUnits, localItemSearch]
  );

  // Samme filtrering, bare på items for den valgte lokation.
  const displayedLocationItems = useMemo(
    () =>
      selectedLocationView
        ? itemsAtSelectedLocation.filter((item) => itemMatchesFilters(item, selectedStatuses, selectedUnits, localItemSearch))
        : [],
    [itemsAtSelectedLocation, selectedLocationView, selectedStatuses, selectedUnits, localItemSearch]
  );

  // Fælles props for item-panelet i begge faner.
  const itemPanelProps = {
    search: localItemSearch,
    onSearchChange: setLocalItemSearch,
    locationsById,
    onClearFilters: () => { resetFilters(); setLocalItemSearch(''); },
    onAddItems: () => setIsAddItemsModalOpen(true),
    canCreate,
    canDelete,
    isSelectMode,
    selectedIds: selectedItemIds,
    onToggleSelected: toggleItemSelected,
    onEnterSelectMode: () => setIsSelectMode(true),
    onExitSelectMode: exitSelectMode,
    onDeleteSelected: () => setIsDeleteItemsOpen(true),
  };

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
      <Alert>{t('noAccess')}</Alert>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Modalerne mountes kun mens de er åbne (key = målet), så de
          altid starter fra det rigtige udgangspunkt. */}
      {isAddModalOpen && (
        <AddCategoryComponent
          onClose={() => setIsAddModalOpen(false)}
          parentId={addParentId}
          parentPath={addParentPath}
          nextRank={addNextRank}
          onSuccess={handleCategoryAdded}
        />
      )}

      {editCategoryTarget && (
        <EditCategoryComponent
          key={editCategoryTarget.id}
          onClose={() => setEditCategoryTarget(null)}
          category={editCategoryTarget}
          categoryTree={categoryTree}
        />
      )}

      {deleteCategoryTarget && (
        <DeleteCategoryComponent
          key={deleteCategoryTarget.id}
          category={deleteCategoryTarget}
          onClose={() => setDeleteCategoryTarget(null)}
          onDeleted={handleCategoriesDeleted}
        />
      )}

      {addLocationParent !== undefined && (
        <LocationFormModal
          parent={addLocationParent}
          onClose={() => setAddLocationParent(undefined)}
          onCreated={handleLocationAdded}
        />
      )}

      {editLocationTarget && (
        <LocationFormModal location={editLocationTarget} onClose={() => setEditLocationTarget(null)} />
      )}

      <DeleteLocationComponent
        isOpen={!!deleteLocationTarget}
        location={deleteLocationTarget}
        sectionCount={deleteLocationSectionCount}
        onClose={() => setDeleteLocationTarget(null)}
        onDeleted={handleLocationDeleted}
      />

      {isAddItemsModalOpen && (
        <AddItemsComponent
          onClose={() => setIsAddItemsModalOpen(false)}
          categoryTree={categoryTree}
          categoryId={leftTab === 'locations' ? null : (selectedCategory?.id ?? null)}
          categoryTitle={leftTab === 'locations' ? undefined : selectedCategory?.title}
          canCreate={canCreate}
        />
      )}

      {selectedItem && (
        <ItemDetailComponent
          key={selectedItem.id}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onViewLocation={(loc) => { setSelectedItem(null); handleSelectLocationView(loc); }}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}

      {isDeleteItemsOpen && itemsMarkedForDeletion.length > 0 && (
        <DeleteItemsComponent
          items={itemsMarkedForDeletion}
          onClose={() => setIsDeleteItemsOpen(false)}
          onDeleted={handleItemsDeleted}
        />
      )}

      <Alert>{errorMessage}</Alert>

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
              <span>{t('filter.heading')}</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 text-xs bg-accent text-accent-text rounded-full w-4 h-4 flex items-center justify-center shrink-0">
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
      <div className="grid grid-cols-1 md:grid-cols-12 md:items-start gap-4 sm:gap-6">
        <div className="md:col-span-5 lg:col-span-4 2xl:col-span-3 bg-white rounded-xl border border-border-gray p-3 sm:p-4 shadow-sm flex flex-col justify-between md:min-h-[500px] dark:bg-slate-800 dark:border-slate-700">
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

            <Alert className="mb-3">{favoriteError}</Alert>

            <FavoritesSection
              entries={leftTab === 'categories' ? categoryFavoriteEntries : locationFavoriteEntries}
            />

            {leftTab === 'categories' ? (
              <>
                <Alert className="mb-3">{moveCategoryError}</Alert>

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
                        favoriteIds={favoriteCategoryIds}
                        canFavorite={canRead}
                        onToggleFavorite={handleToggleCategoryFavorite}
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
                      isExpanded={expandedWarehouseIds.has(warehouse.id)}
                      onToggleExpand={toggleExpandWarehouse}
                      favoriteIds={favoriteLocationIds}
                      canFavorite={canRead}
                      onToggleFavorite={handleToggleLocationFavorite}
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
              className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('page.createCategory')}</span>
            </button>
          )}

          {leftTab === 'locations' && canCreate && (
            <button
              type="button"
              onClick={() => handleOpenAddLocation(null)}
              className="flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-lg bg-accent hover:bg-accent-hover text-accent-text text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('locations.createWarehouseButton')}</span>
            </button>
          )}
        </div>

        <div className="md:col-span-7 lg:col-span-8 2xl:col-span-9 bg-white rounded-xl border border-border-gray p-4 sm:p-6 shadow-sm md:min-h-[500px] dark:bg-slate-800 dark:border-slate-700">
          {leftTab === 'locations' ? (
            selectedLocationView ? (
              <ItemListPanel
                {...itemPanelProps}
                heading={<>
  <div className="flex items-center gap-2 mb-1">
    <LocationKindBadge location={selectedLocationView} />
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
    {canRead && (
      <FavoriteStarButton
        variant="heading"
        isFavorite={favoriteLocationIds.has(selectedLocationView.id)}
        onToggle={() => handleToggleLocationFavorite(selectedLocationView.id)}
      />
    )}
  </div>
  {selectedLocationView.address && (
    <p className="text-xs text-secondary mt-1 dark:text-slate-400">{selectedLocationView.address}</p>
  )}
</>}
                chipsTitle={t('page.categoriesHere')}
                chips={categoryChips}
                searchPlaceholder={t('page.filterItemsAtLocationPlaceholder')}
                totalCount={itemsAtSelectedLocation.length}
                items={displayedLocationItems}
                emptyText={t('page.noItemsAtLocationYet')}
                placementIds={(item) => placementIdsFor(item.id, selectedLocationIds)}
                onOpenItem={handleOpenItemFromLocation}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-secondary text-sm py-12 dark:text-slate-400">
                {t('locations.chooseInTree')}
              </div>
            )
          ) : selectedCategory ? (
            <ItemListPanel
              {...itemPanelProps}
              heading={<>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-serif text-primary font-semibold truncate dark:text-slate-100">
                      {selectedCategory.title}
                    </h1>
                    {canRead && (
                      <FavoriteStarButton
                        variant="heading"
                        isFavorite={favoriteCategoryIds.has(selectedCategory.id)}
                        onToggle={() => handleToggleCategoryFavorite(selectedCategory.id)}
                      />
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-1 truncate dark:text-slate-400">
                    {t('categoryIdValue', { id: selectedCategory.id })}
                  </p>
</>}
              chipsTitle={t('page.placements')}
              chips={locationChips}
              searchPlaceholder={t('page.filterItemsPlaceholder')}
              totalCount={aggregatedItems.length}
              items={displayedItems}
              emptyText={t('page.noItemsInCategory')}
              placementIds={(item) => placementIdsFor(item.id)}
              onOpenItem={setSelectedItem}
            />
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