
export interface DataLayerItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  itemStatus: 'Available' | 'Out of Stock' | 'Reserved' | 'Damaged' | 'In Use' | 'Missing' | 'Maintenance';
  itemLocation: ItemLocation;
}

export interface DataLayerCat {
  id: number;
  titel: string;
  ranked: number;
  items: DataLayerItem[];
  subCategories: DataLayerCat[];
}

export interface ItemLocation{
  id: number;
  name: string;
  description: string;
  adress: string;
}

export interface RawCategory {
  id: number;
  titel: string;
  ranked: number;
  parent_id: number | null;
}

export interface CategoryTreeNodeProps {
  category: DataLayerCat;
  selectedCategoryId: number | null;
  onSelectCategory: (category: DataLayerCat) => void;
  onAddSubCategory: (parentId: number) => void;
}