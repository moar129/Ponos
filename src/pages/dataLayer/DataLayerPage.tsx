import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks/hooksCategory';
import {
  fetchCategoriesThunk,
  setSelectedCategoryId,
} from '../../store/slices/categorySlice';
import type { DataLayerCat } from '../../types/dataLayer/datalayerTypes';
import { CategoryTreeNode } from '../../components/dataLayer/CategoriTreeNodeComponent';
import { AddCategoryComponent } from '../../components/dataLayer/addCategoryComponent';
import { Search, Filter, Plus, Box, Loader2 } from 'lucide-react';

export function DataLayerPage() {
  const dispatch = useAppDispatch();
  const { tree: categoryTree, loading } = useAppSelector((state) => state.categories);

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdFromUrl = searchParams.get('catId');

  const [selectedCategory, setSelectedCategory] = useState<DataLayerCat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addParentTitle, setAddParentTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

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

  useEffect(() => {
    if (categoryTree.length > 0) {
      if (categoryIdFromUrl) {
        const found = findCategoryInTree(categoryTree, categoryIdFromUrl);
        if (found) {
          setSelectedCategory(found);
          dispatch(setSelectedCategoryId(found.id));
          return;
        }
      }
      setSelectedCategory(categoryTree[0]);
      dispatch(setSelectedCategoryId(categoryTree[0].id));
    }
  }, [categoryIdFromUrl, categoryTree, dispatch]);

  const handleSelectCategory = (category: DataLayerCat) => {
    setSelectedCategory(category);
    dispatch(setSelectedCategoryId(category.id));
    setSearchParams({ catId: category.id });
  };

  const handleOpenAddModal = (parentId: string | null) => {
    setAddParentId(parentId);
    if (parentId) {
      const parentCat = findCategoryInTree(categoryTree, parentId);
      setAddParentTitle(parentCat?.title);
    } else {
      setAddParentTitle(undefined);
    }
    setIsAddModalOpen(true);
  };

  const handleCategoryAdded = async (newCategoryId: string) => {
    await dispatch(fetchCategoriesThunk()).unwrap();
    setSearchParams({ catId: newCategoryId });
  };

  return (
    <div className="space-y-6">
      <AddCategoryComponent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        parentId={addParentId}
        parentTitle={addParentTitle}
        onSuccess={handleCategoryAdded}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B132A] p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Søg..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#C7975D] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors border border-slate-200"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 xl:col-span-3 bg-[#0B132A] rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
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
                    onAddSubCategory={handleOpenAddModal}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C7975D] hover:bg-[#b5854b] text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Opret kategori</span>
          </button>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 bg-[#0B132A] rounded-xl border border-slate-200 p-6 shadow-sm min-h-[500px]">
          {selectedCategory ? (
            <div>
              <div className="mb-6 pb-4 border-b border-slate-200">
                <h1 className="text-2xl font-serif text-slate-300 font-semibold">
                  {selectedCategory.title}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Kategori ID: {selectedCategory.id}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                <Box className="w-12 h-12 mb-3 stroke-[1.5] text-slate-400" />
                <p className="text-base font-medium text-slate-700">
                  Ingen items tilknyttet endnu
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Kategoristrukturen er klar. Håndtering af items og lokationer kan tilføjes senere.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm">
              Vælg en kategori i menuen til venstre
            </div>
          )}
        </div>
      </div>
    </div>
  );
}