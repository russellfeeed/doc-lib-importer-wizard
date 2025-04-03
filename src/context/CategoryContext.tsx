
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

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hierarchy, setHierarchy] = useState<CategoryHierarchy>({ categories: [] });

  useEffect(() => {
    const loaded = loadCategories();
    setHierarchy(loaded);
  }, []);

  const addNewCategory = (parentId: string | null, name: string) => {
    const updated = addCategory(hierarchy, parentId, name);
    setHierarchy(updated);
    saveCategories(updated);
  };

  const deleteCategory = (categoryId: string) => {
    const updated = removeCategory(hierarchy, categoryId);
    setHierarchy(updated);
    saveCategories(updated);
  };

  const moveNode = (categoryId: string, newParentId: string | null) => {
    const updated = moveCategory(hierarchy, categoryId, newParentId);
    setHierarchy(updated);
    saveCategories(updated);
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    const updated = renameCategory(hierarchy, categoryId, newName);
    setHierarchy(updated);
    saveCategories(updated);
  };

  return (
    <CategoryContext.Provider
      value={{
        hierarchy,
        addNewCategory,
        deleteCategory,
        moveNode,
        updateCategoryName
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
};
