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
}

export interface AddCategoryComponentProps {
  isOpen: boolean;
  onClose: () => void;
  parentId: string | null;
  parentTitle?: string;
  onSuccess: (newCategoryId: string) => void;
}