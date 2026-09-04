export interface DataLayerItem {
  id: string;
  itemLocationId: string;
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