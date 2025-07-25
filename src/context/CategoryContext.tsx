
import React, { createContext, useContext, useState, useEffect } from "react";
import { CategoryHierarchy, CategoryNode } from "@/types/categories";
import { loadCategories, saveCategories, addCategory, removeCategory, moveCategory, renameCategory, clearCategories } from "@/utils/categoryUtils";

interface CategoryContextType {
  hierarchy: CategoryHierarchy;
  addNewCategory: (parentId: string | null, name: string) => string;
  deleteCategory: (categoryId: string) => void;
  moveNode: (categoryId: string, newParentId: string | null) => void;
  updateCategoryName: (categoryId: string, newName: string) => void;
  clearAllCategories: () => void;
}

// Create a default context with dummy implementations
const defaultContext: CategoryContextType = {
  hierarchy: { categories: [] },
  addNewCategory: () => '',
  deleteCategory: () => {},
  moveNode: () => {},
  updateCategoryName: () => {},
  clearAllCategories: () => {}
};

const CategoryContext = createContext<CategoryContextType>(defaultContext);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hierarchy, setHierarchy] = useState<CategoryHierarchy>({ categories: [] });
  const [isInitialized, setIsInitialized] = useState(false);

  // Load categories from localStorage on initial mount only
  useEffect(() => {
    try {
      const loaded = loadCategories();
      setHierarchy(loaded);
    } catch (error) {
      console.error("Error loading categories:", error);
      // Fallback to empty categories if loading fails
      setHierarchy({ categories: [] });
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage whenever hierarchy changes, but only after initial load
  useEffect(() => {
    console.log('💾 CategoryContext: Save effect triggered');
    console.log('🔍 CategoryContext: isInitialized:', isInitialized, 'hierarchy:', hierarchy);
    
    if (isInitialized) {
      try {
        console.log('💾 CategoryContext: Saving to localStorage...');
        saveCategories(hierarchy);
        console.log('✅ CategoryContext: Saved to localStorage successfully');
      } catch (error) {
        console.error("❌ CategoryContext: Error saving categories:", error);
      }
    } else {
      console.log('⏭️ CategoryContext: Skipping save - not initialized yet');
    }
  }, [hierarchy, isInitialized]);

  const addNewCategory = (parentId: string | null, name: string): string => {
    console.log(`➕ CategoryContext: Adding category "${name}" under parent: ${parentId || 'root'}`);
    console.log('📊 CategoryContext: Current hierarchy before add:', JSON.stringify(hierarchy, null, 2));
    
    const result = addCategory(hierarchy, parentId, name);
    console.log('📊 CategoryContext: Result from addCategory:', JSON.stringify(result, null, 2));
    
    setHierarchy(result.hierarchy);
    console.log(`✅ CategoryContext: setHierarchy called, new category ID: ${result.newCategoryId}`);
    
    // Add a small delay to check if state actually updated
    setTimeout(() => {
      console.log('🔍 CategoryContext: Checking state after 100ms:', JSON.stringify(hierarchy, null, 2));
    }, 100);
    
    return result.newCategoryId;
  };

  const deleteCategory = (categoryId: string) => {
    const updated = removeCategory(hierarchy, categoryId);
    setHierarchy(updated);
  };

  const moveNode = (categoryId: string, newParentId: string | null) => {
    const updated = moveCategory(hierarchy, categoryId, newParentId);
    setHierarchy(updated);
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    const updated = renameCategory(hierarchy, categoryId, newName);
    setHierarchy(updated);
  };

  const clearAllCategories = () => {
    console.log('🗑️ CategoryContext: Clearing all categories...');
    console.log('📊 Current hierarchy before clear:', hierarchy);
    const updated = clearCategories();
    console.log('📊 Updated hierarchy after clear:', updated);
    setHierarchy(updated);
    console.log('✅ CategoryContext: setHierarchy called with cleared data');
  };

  const contextValue = {
    hierarchy,
    addNewCategory,
    deleteCategory,
    moveNode,
    updateCategoryName,
    clearAllCategories
  };

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
};
