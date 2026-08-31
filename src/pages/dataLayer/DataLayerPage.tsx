import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { DataLayerCat, RawCategory } from '../../types/dataLayer/datalayerTypes';
import { CategoryTreeNode } from '../../components/dataLayer/CategoriTreeNodeComponent';
import { Search, Filter, Plus, Box, Loader2 } from 'lucide-react';

export function DataLayerPage() {
  // Navigation & URL-tilstand
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('catId');

  // React State for data
  const [categoryTree, setCategoryTree] = useState<DataLayerCat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DataLayerCat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Hent kategorier fra Supabase
  useEffect(() => {
    fetchCategories();
  }, []);

function buildCategoryTree(
  rawCategories: RawCategory[],
  parentId: number | null = null
): DataLayerCat[] {
  return rawCategories
    .filter((cat) => cat.parent_id === parentId)
    .sort((a, b) => a.ranked - b.ranked)
    .map((cat) => ({
      id: cat.id,
      titel: cat.titel,
      ranked: cat.ranked,
      items: [], // Tom indtil items implementeres senere
      subCategories: buildCategoryTree(rawCategories, cat.id),
    }));
}

// Hjælpefunktion til at finde en kategori ud fra et ID i hele træet
function findCategoryInTree(
  categories: DataLayerCat[],
  id: number
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

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('ranked', { ascending: true });

    if (error) {
      console.error('Fejl ved hentning af kategorier fra Supabase:', error);
    } else if (data) {
      const tree = buildCategoryTree(data as RawCategory[]);
      setCategoryTree(tree);

      // Hvis der er et catId i URL'en, find den valgte kategori
      if (categoryIdFromUrl) {
        const found = findCategoryInTree(tree, Number(categoryIdFromUrl));
        if (found) {
          setSelectedCategory(found);
        } else if (tree.length > 0) {
          setSelectedCategory(tree[0]);
        }
      } else if (tree.length > 0) {
        // Standard til den første kategori hvis intet var i URL
        setSelectedCategory(tree[0]);
      }
    }
    setLoading(false);
  };

  // 2. Opdater den valgte kategori når URL parametret skifter
  useEffect(() => {
    if (categoryIdFromUrl && categoryTree.length > 0) {
      const found = findCategoryInTree(categoryTree, Number(categoryIdFromUrl));
      if (found) {
        setSelectedCategory(found);
      }
    }
  }, [categoryIdFromUrl, categoryTree]);

  // Håndter valg af kategori i UI (skifter URL og opdaterer state)
  const handleSelectCategory = (category: DataLayerCat) => {
    setSelectedCategory(category);
    // Brug useNavigate / useSearchParams til at lægge kategorien i URL'en
    setSearchParams({ catId: category.id.toString() });
  };

  // Opret ny kategori i Supabase
  const handleAddCategory = async (parentId: number | null) => {
    const titel = prompt(
      parentId ? 'Indtast navn på underkategori:' : 'Indtast navn på hovedkategori:'
    );
    if (!titel) return;

    const newCat = {
      titel,
      parent_id: parentId,
      ranked: 1,
    };

    const { data, error } = await supabase
      .from('categories')
      .insert([newCat])
      .select();

    if (error) {
      console.error('Fejl ved oprettelse af kategori:', error);
    } else if (data && data[0]) {
      // Genhent kategorier fra Supabase
      await fetchCategories();
      // Naviger direkte til den nye kategori med useNavigate
      navigate(`?catId=${data[0].id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topbar med søgning & overordnede knapper */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B132A] p-4 rounded-xl border border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Søg..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#C7975D] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddCategory(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Opret kategori</span>
          </button>
        </div>
      </div>

      {/* Grid Layout med 2 kolonner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Venstre side: Kategori-Stamtræ */}
        <div className="lg:col-span-4 xl:col-span-3 bg-[#0B132A] rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Kategorier
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#C7975D]" />
              </div>
            ) : (
              <div className="space-y-1">
                {categoryTree.map((cat) => (
                  <CategoryTreeNode
                    key={cat.id}
                    category={cat}
                    selectedCategoryId={selectedCategory?.id ?? null}
                    onSelectCategory={handleSelectCategory}
                    onAddSubCategory={handleAddCategory}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleAddCategory(null)}
            className="mt-6 flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Opret hovedkategori</span>
          </button>
        </div>

        {/* Højre side: Visning af den valgte kategori */}
        <div className="lg:col-span-8 xl:col-span-9 bg-[#0B132A] rounded-xl border border-slate-800 p-6 shadow-sm min-h-[500px]">
          {selectedCategory ? (
            <div>
              <div className="mb-6 pb-4 border-b border-slate-800">
                <h1 className="text-2xl font-serif text-slate-100 font-semibold">
                  {selectedCategory.titel}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Kategori ID: {selectedCategory.id} | Rank: {selectedCategory.ranked}
                </p>
              </div>

              {/* Placeholder indtil items implementeres senere */}
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-900/20">
                <Box className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600" />
                <p className="text-base font-medium text-slate-400">
                  Ingen items tilknyttet endnu
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Kategoristrukturen er klar. Håndtering af items og lokationer kan tilføjes senere.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Vælg en kategori i menuen til venstre
            </div>
          )}
        </div>
      </div>
    </div>
  );
}