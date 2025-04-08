
import React, { createContext, useContext, useState, useEffect } from "react";
import { CategoryHierarchy, CategoryNode } from "@/types/categories";
import { loadCategories, saveCategories, addCategory, removeCategory, moveCategory, renameCategory } from "@/utils/categoryUtils";

interface CategoryContextType {
  hierarchy: CategoryHierarchy;
  addNewCategory: (parentId: string | null, name: string) => void;
  deleteCategory: (categoryId: string) => void;
  moveNode: (categoryId: string, newParentId: string | null) => void;
  updateCategoryName: (categoryId: string, newName: string) => void;
}

// Create a default context with dummy implementations
const defaultContext: CategoryContextType = {
  hierarchy: { categories: [] },
  addNewCategory: () => {},
  deleteCategory: () => {},
  moveNode: () => {},
  updateCategoryName: () => {}
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
    if (isInitialized) {
      try {
        saveCategories(hierarchy);
      } catch (error) {
        console.error("Error saving categories:", error);
      }
    }
  }, [hierarchy, isInitialized]);

  const addNewCategory = (parentId: string | null, name: string) => {
    const updated = addCategory(hierarchy, parentId, name);
    setHierarchy(updated);
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

  const contextValue = {
    hierarchy,
    addNewCategory,
    deleteCategory,
    moveNode,
    updateCategoryName
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
