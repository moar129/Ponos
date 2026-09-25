export type ItemStatus =
  | 'Available'
  | 'Reserved'
  | 'OutOfStock'
  | 'InUse'
  | 'Missing'
  | 'Damaged'
  | 'Maintenance'
  | 'Consumed'
  | 'NeedsEmptying'
  | 'NeedsRefilling';

// US-42: quantity/status er ikke længere felter man selv sætter på
// item'et - de er en afledt sum over item'ets enheder/batches
// (data_layer_item_units). quantity er en client-beregnet
// bekvemmelighed (sum af statusCounts), statusCounts kommer direkte fra
// data_layer_item_status_counts-viewet.
export interface DataLayerItem {
  id: string;
  itemLocationId?: string | null;
  organisationId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  packaging?: string | null;
  unitOfMeasurement: string;
  quantity: number;
  statusCounts: Partial<Record<ItemStatus, number>>;
  // Sat hvis MINDST én af item'ets enheder er kapacitets-sporet (Beholder,
  // fx en tank) - da er `quantity` et ANTAL beholdere, ikke en mængde i
  // unitOfMeasurement, og enheden bør ikke vises ved siden af Antal (se
  // formatItemQuantity nedenfor). Fra has_capacity_units i
  // data_layer_item_status_counts-viewet.
  hasCapacityUnits: boolean;
  // Valgfrit, kun meningsfuldt for Mængde (isDiscrete=false, ingen
  // kapacitets-sporing): "1 [packaging] = packageSize [unitOfMeasurement]"
  // (fx "1 big bag = 500 kg"). Bruges i opret-/genopfyldningsformularer til
  // at udlede quantity ud fra et "antal emballager"-hjælpefelt - se
  // addItemsComponent.tsx/itemsDetailComponent.tsx.
  packageSize?: number | null;
}

// "Antal: {{quantity}} {{unitOfMeasurement}}" giver kun mening når quantity
// er en mængde/et styktal i den enhed (Enkelt enhed/Mængde) - for en
// Beholder er quantity et antal beholdere (fx "2"), og "2 liter" ville være
// direkte misvisende. Niveauet pr. beholder vises i stedet under "Enheder"
// (itemsDetailComponent.tsx).
export function formatItemQuantity(item: Pick<DataLayerItem, 'quantity' | 'unitOfMeasurement' | 'hasCapacityUnits'>): string {
  return item.hasCapacityUnits ? String(item.quantity) : `${item.quantity} ${item.unitOfMeasurement}`;
}

// Én fysisk enhed (quantity=1, evt. serienummer) ELLER et målt batch
// (quantity>1, intet serienummer) - se data_layer_item_units i dbSchema.sql.
// contentsTotal/contentsRemaining er sat, hvis DENNE ENE enhed selv er en
// beholder med internt indhold (fx én 12-pack sodavand, der selv rummer
// 12 dåser) - hver enhed sporer sit eget fyldniveau uafhængigt af
// søskende-enheder (der er ingen delt pulje/gruppe).
export interface ItemUnit {
  id: string;
  itemId: string;
  organisationId: string;
  itemLocationId?: string | null;
  serialNumber?: string | null;
  quantity: number;
  status: ItemStatus;
  contentsTotal?: number | null;
  contentsRemaining?: number | null;
  // null = ingen automatisk statusskift ved denne tærskel.
  contentsEmptyStatus?: ItemStatus | null;
  contentsPartialStatus?: ItemStatus | null;
  contentsFullStatus?: ItemStatus | null;
}

// Available quantity of one item at one location (null = no location).
export interface AvailableUnitLocation {
  itemId: string;
  locationId: string | null;
  quantity: number;
}

// Quantity of one item's units at one location with one status (null = no location).
export interface UnitLocationCount {
  itemId: string;
  locationId: string | null;
  status: ItemStatus;
  quantity: number;
}

// Where (part of) an item physically is - derived from its units' locations.
export interface ItemPlacement {
  locationId: string | null;
  quantity: number;
  statusCounts: Partial<Record<ItemStatus, number>>;
}

// Rene forslag (datalist) - felterne forbliver frit tekst, ingen logik er
// bundet til den konkrete værdi. Hjælper brugeren med hvad der plejer at
// give mening at skrive, uden at begrænse dem til en fast liste.
export const UNIT_OF_MEASUREMENT_SUGGESTIONS = ['stk', 'dåse', 'flaske', 'kg', 'liter', 'palle', 'sæk', 'karton'];

// To sæt, da "hvordan er det pakket" betyder noget forskelligt for
// enkeltstyk (et styktal, fx en 12-pack) end for en målt mængde (en
// beholder/transportform, fx en sæk eller palle) - se addItemsComponent.tsx.
export const PACKAGING_SUGGESTIONS_DISCRETE = ['6-pack', '12-pack', '24-pack', 'kasse', 'rulle', 'palle'];
export const PACKAGING_SUGGESTIONS_MEASURED = ['sæk', 'palle', 'dunk', 'spand', 'tønde', 'big bag', 'container', 'affaldssæk'];

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

// Personlig stjernemarkering (data_layer_favorites) - præcis ét af
// categoryId/locationId er sat.
export interface DataLayerFavorite {
  id: string;
  categoryId: string | null;
  locationId: string | null;
}

export type DataLayerFavoriteTarget = { categoryId: string } | { locationId: string };

export interface FavoriteEntry {
  key: string;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  // Kun sat på selve favoritten - undergrupper vist under den har ingen stjerne.
  onRemove?: () => void;
  // Undergrupper (underkategorier/sektioner), der kan foldes ud i listen.
  children: FavoriteEntry[];
}

export interface FavoritesSectionProps {
  entries: FavoriteEntry[];
}

export interface FavoriteRowProps {
  entry: FavoriteEntry;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
}

export interface FavoriteStarButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  // Detalje-overskriften: tom stjerne altid synlig (ingen hover-regel) og større.
  variant?: 'row' | 'heading';
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
  // Personlige favoritter - gated separat på canFavorite (read_datalayer),
  // uafhængigt af canUpdate.
  favoriteIds: Set<string>;
  canFavorite: boolean;
  onToggleFavorite: (id: string) => void;
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


export const ALL_ITEM_STATUSES: ItemStatus[] = [
  'Available',
  'Reserved',
  'OutOfStock',
  'InUse',
  'Missing',
  'Damaged',
  'Maintenance',
  'Consumed',
  'NeedsEmptying',
  'NeedsRefilling',
];

export const ITEM_STATUS_STYLES: Record<ItemStatus, string> = {
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  Reserved: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  OutOfStock: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  InUse: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  Missing: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Damaged: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  Maintenance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  Consumed: 'bg-bg-gray text-secondary border-border-gray dark:bg-slate-700 dark:text-slate-400 dark:border-slate-700',
  NeedsEmptying: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  NeedsRefilling: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
};

// isDiscrete afgør row-formen - UAFHÆNGIGT af hvad der står i
// unitOfMeasurement (som er frit tekst, fx "dåse"/"flaske"/"kg"): true =
// N enheder à quantity=1 (evt. serienummer pr. enhed via
// serialNumbersRaw, kommasepareret), false = ét batch med quantity=N,
// intet serienummer. Se docs/dbSchema.sql §15.21 add_item_with_units.
export interface ItemRow {
  key: string;
  name: string;
  description: string;
  packaging: string;
  unitOfMeasurement: string;
  // Talfelterne er tekst, så feltet kan være tomt mens man skriver - se
  // utils/numberInput.ts. Parses til tal ved indsendelse.
  quantity: string;
  itemStatus: ItemStatus;
  isDiscrete: boolean;
  serialNumbersRaw: string;
  // Kun relevant når isDiscrete=true: hver af de N oprettede enheder får
  // sit EGET contentsTotal/contentsRemaining = contentsTotal (fx 12 for
  // en 12-pack) - quantity styrer stadig kun hvor mange enheder der
  // oprettes (fx 5 kasser), helt uafhængigt af contentsTotal.
  hasContents: boolean;
  contentsTotal: string;
  // Kun relevant når hasContents=true OG isDiscrete=false (Målt mængde +
  // kapacitet, fx en tank): startniveau pr. oprettet beholder. '' = start
  // fuld (= contentsTotal). Uden betydning for isDiscrete=true (Enkeltstyk
  // + indhold, fx 12-pack, starter altid fuld). Se add_item_with_units i
  // docs/dbSchema.sql §15.21.
  contentsStart: string;
  // Kun relevant når hasContents=true: hvilken status enheden automatisk
  // skal skifte til ved hhv. tomt/delvist/fuldt indhold. '' = ingen
  // automatisk ændring ved den tærskel. Se sync_status_from_contents i
  // docs/dbSchema.sql §15.21.
  contentsEmptyStatus: ItemStatus | '';
  contentsPartialStatus: ItemStatus | '';
  contentsFullStatus: ItemStatus | '';
  // Kun relevant når !isDiscrete && !hasContents (Mængde): "1 [packaging] =
  // packageSize [unitOfMeasurement]" (fx "1 big bag = 500 kg"). Når sat,
  // betyder `quantity` ANTAL EMBALLAGER (som containerCount for Beholder) -
  // hver emballage bliver sin egen enhed, se add_item_with_units.
  packageSize: string;
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
  // Fase 3: create_datalayer - canCreate gater "Opret lager"/"+ ny sektion".
  canCreate: boolean;
}

export interface FilterPanelComponentProps {
  isOpen: boolean;
  statuses: ItemStatus[];
  selectedStatuses: Set<ItemStatus>;
  onToggleStatus: (status: ItemStatus) => void;
  units: string[];
  selectedUnits: Set<string>;
  onToggleUnit: (unit: string) => void;
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
  favoriteIds: Set<string>;
  canFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}
export interface ItemLocationTagProps {
  // Alle steder item'et ligger (null = uden lager); første vises, resten som "+N".
  locationIds: (string | null)[];
  locationsById: Map<string, ItemLocation>;
  className?: string;
}

export interface ItemCategoryTagProps {
  categoryPath: string;
  className?: string;
}

export type SummaryChipKind = 'category' | 'warehouse' | 'section' | 'none';

export interface SummaryChip {
  id: string;
  label: string;
  count: number;
  kind: SummaryChipKind;
  onNavigate?: () => void;
}

export interface SummaryChipsProps {
  title: string;
  chips: SummaryChip[];
}
