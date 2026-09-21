export interface DataLayerItem {
  id: string;
  itemLocationId?: string | null; 
  organisationId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  quantity: number;
  itemStatus: 'Available' | 'Reserved' | 'OutOfStock' | 'InUse' | 'Missing' | 'Damaged' | 'Maintenance';
}

export interface DataLayerCat {
  id: string;
  title: string;
  rank: number;
  items: DataLayerItem[];
  subCategories: DataLayerCat[];
  organisationId: string;
  parentCategoryId: string | null;
}

export interface ItemLocation {
  id: string;
  organisationId: string;
  name: string;
  description?: string | null;
  address?: string | null;
  parentLocationId?: string | null;
}

export interface RawCategory {
  id: string;
  title: string;
  rank: number;
  parent_category_id: string | null;
  organisation_id: string;
}

export interface CategoryTreeNodeProps {
  category: DataLayerCat;
  selectedCategoryId: string | null;
  onSelectCategory: (category: DataLayerCat) => void;
  onAddSubCategory: (parentId: string) => void;
  onEditCategory: (category: DataLayerCat) => void; // ny
  onDeleteCategory: (category: DataLayerCat) => void; // ny
  // Fase 3: create/read/update/delete_datalayer - gater knapperne pr. handling.
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  expandedCategoryIds: Set<string>;
  onToggleExpand: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isMoving: boolean;
  onMoveUp: (category: DataLayerCat) => void;
  onMoveDown: (category: DataLayerCat) => void;
}

export interface EditCategoryComponentProps {
  isOpen: boolean;
  onClose: () => void;
  category: DataLayerCat | null;
  categoryTree: DataLayerCat[];
}

export interface AddCategoryComponentProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  parentPath?: string[];
  nextRank: number;
  onSuccess: (newCategoryId: string) => void;
}

export interface AggregatedItem extends DataLayerItem {
  sourceCategoryTitle: string;
  isFromSubCategory: boolean;
}

export interface AddItemsComponentProps {
  isOpen: boolean;
  onClose: () => void;
  categoryTree: DataLayerCat[]; // NYT: hele træet, så en anden kategori kan vælges
  categoryId: string | null;    // forudvalgt/foreslået kategori (den man havde åben)
  categoryTitle?: string;
  onSuccess?: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface ItemDetailComponentProps {
  item: AggregatedItem | null;
  onClose: () => void;
  onViewLocation: (location: ItemLocation) => void;
  // Fase 3: create/read/update/delete_datalayer - ét fælles domæne for
  // items OG lokationer, så samme tre booleans sendes videre til
  // LocationPickerComponent (lokations-feltet i redigerings-visningen).
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}


export type ItemStatus = DataLayerItem['itemStatus'];

export const ALL_ITEM_STATUSES: ItemStatus[] = [
  'Available',
  'Reserved',
  'OutOfStock',
  'InUse',
  'Missing',
  'Damaged',
  'Maintenance',
];

export const ITEM_STATUS_STYLES: Record<ItemStatus, string> = {
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  Reserved: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  OutOfStock: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  InUse: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  Missing: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Damaged: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Maintenance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  Available: 'Tilgængelig',
  Reserved: 'Reserveret',
  OutOfStock: 'Udsolgt',
  InUse: 'I brug',
  Missing: 'Mangler',
  Damaged: 'Beskadiget',
  Maintenance: 'Vedligehold',
};

export interface ItemRow {
  key: string;
  name: string;
  description: string;
  quantity: number;
  itemStatus: ItemStatus;
}

export interface DeleteCategoryComponentProps {
  isOpen: boolean;
  category: DataLayerCat | null;
  onClose: () => void;
  onDeleted: (deletedIds: string[]) => void;
}

export interface SubCategoryCheckboxProps {
  category: DataLayerCat;
  depth: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export interface DeleteItemsComponentProps {
  isOpen: boolean;
  items: AggregatedItem[];
  onClose: () => void;
  onDeleted: (deletedIds: string[]) => void;
}


export interface ConfirmDialogComponentProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface LocationPickerComponentProps {
  value: string | null;
  onChange: (locationId: string | null) => void;
  onViewItems?: (location: ItemLocation) => void;
  // Fase 3: create/update/delete_datalayer - canCreate gater "+ Opret ny
  // lokation", canUpdate/canDelete sendes videre til LocationManagerComponent.
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface FilterPanelComponentProps {
  isOpen: boolean;
  categories: DataLayerCat[];
  statuses: ItemStatus[];
  selectedCategoryIds: Set<string>;
  selectedStatuses: Set<ItemStatus>;
  onToggleCategory: (id: string) => void;
  onToggleStatus: (status: ItemStatus) => void;
  onClear: () => void;
  onClose: () => void;
}

export interface LocationItemsComponentProps {
  isOpen: boolean;
  location: ItemLocation | null;
  items: AggregatedItem[];
  onClose: () => void;
  onSelectItem: (item: AggregatedItem) => void;
}

export interface GlobalSearchResultsComponentProps {
  isOpen: boolean;
  query: string;
  matchedCategories: DataLayerCat[];
  matchedItems: AggregatedItem[];
  onSelectCategory: (category: DataLayerCat) => void;
  onSelectItem: (item: AggregatedItem) => void;
}



export interface LocationManagerComponentProps {
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  items?: AggregatedItem[];
  onSelectItem?: (item: AggregatedItem) => void;
}

export interface LocationTreeNodeProps {
  location: ItemLocation;
  childSections: ItemLocation[];
  isWarehouse: boolean;
  selectedLocationId: string | null;
  onSelectLocation: (location: ItemLocation) => void;
  onAddSection: (warehouseId: string) => void;
  onEditLocation: (location: ItemLocation) => void;
  onDeleteLocation: (location: ItemLocation) => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}