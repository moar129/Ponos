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
}

export interface ItemLocation {
  id: string;
  organisationId: string;
  name: string;
  description?: string | null;
  address?: string | null;
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
}

export interface AddCategoryComponentProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  parentTitle?: string;
  onSuccess: (newCategoryId: string) => void;
}

export interface AggregatedItem extends DataLayerItem {
  sourceCategoryTitle: string;
  isFromSubCategory: boolean;
}

export interface AddItemsComponentProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string | null;
  categoryTitle?: string;
  onSuccess?: () => void;
}

export interface ItemDetailComponentProps {
  item: AggregatedItem | null;
  onClose: () => void;
}


export type ItemStatus = DataLayerItem['itemStatus'];

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

export interface LocationManagerComponentProps {
  isOpen: boolean;
  onClose: () => void;
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

export interface GlobalSearchComponentProps {
  isOpen: boolean;
  query: string;
  matchedCategories: DataLayerCat[];
  matchedItems: AggregatedItem[];
  onSelectCategory: (category: DataLayerCat) => void;
  onSelectItem: (item: AggregatedItem) => void;
}
