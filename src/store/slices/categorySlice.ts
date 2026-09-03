import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import type { DataLayerCat, RawCategory, CategoryState} from '../../types/dataLayer/datalayerTypes';

// Rekursiv funktion til opbygning af kategoritræ
function buildCategoryTree(
  rawCategories: RawCategory[],
  parentId: string | null = null
): DataLayerCat[] {
  return rawCategories
    .filter((cat) => cat.parent_category_id === parentId)
    .sort((a, b) => a.rank - b.rank)
    .map((cat) => ({
      id: cat.id,
      title: cat.title,
      rank: cat.rank,
      organisationId: cat.organisation_id,
      items: [],
      subCategories: buildCategoryTree(rawCategories, cat.id),
    }));
}

const initialState: CategoryState = {
  tree: [],
  selectedCategoryId: null,
  loading: false,
  error: null,
};

// Async Thunk: Hent alle kategorier
export const fetchCategoriesThunk = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('data_layer_categories')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      return buildCategoryTree(data as RawCategory[]);
    } catch (err: any) {
      return rejectWithValue(err.message || 'Kunne ikke hente kategorier');
    }
  }
);

// Async Thunk: Opret ny kategori
export const addCategoryThunk = createAsyncThunk(
  'categories/addCategory',
  async (
    payload: { title: string; parentId: string | null; rank: number },
    { rejectWithValue }
  ) => {
    try {
      // Henter brugerens organisation direkte via Supabase (RTK Query-migreringen
      // fjernede authSlice, som denne funktion tidligere - uden effekt - forsøgte at læse fra)
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('Du skal være logget ind for at oprette en kategori.');
      }
      // Henter organisation_id fra profilen
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organisation_id')
        .eq('id', authData.user.id)
        .single();
      // Hvis der ikke findes en organisationstilknytning, kastes en fejl
      if (profileError || !profileData?.organisation_id) {
        throw new Error('Kunne ikke hente din organisationstilknytning.');
      }
      // Brug organisation_id fra profilen til at oprette kategorien
      const organisationId = profileData.organisation_id;

      // Indsætter den nye kategori i databasen
      const { data, error } = await supabase
        .from('data_layer_categories')
        .insert([
          {
            title: payload.title,
            parent_category_id: payload.parentId,
            rank: payload.rank, // Kan nu sendes direkte som null
            organisation_id: organisationId,
          },
        ])
        .select();
      
      // Hvis der opstår en fejl under indsættelsen, kastes en fejl
      if (error) throw error;
      return data[0];
    } catch (err: any) {
      return rejectWithValue(err.message || 'Fejl ved oprettelse af kategori');
    }
  }
);

export const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setSelectedCategoryId: (state, action: PayloadAction<string | null>) => {
      state.selectedCategoryId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.tree = action.payload;
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedCategoryId } = categorySlice.actions;
export default categorySlice.reducer;