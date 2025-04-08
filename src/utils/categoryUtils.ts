import { CategoryHierarchy, CategoryNode } from "@/types/categories";

// Default categories to use if none exist
const DEFAULT_CATEGORIES: CategoryNode[] = [
  {
    id: "1",
    name: "Main Category",
    children: [
      {
        id: "2",
        name: "Subcategory 1",
        children: [],
        parentId: "1"
      },
      {
        id: "3",
        name: "Subcategory 2",
        children: [],
        parentId: "1"
      }
    ],
    parentId: null
  }
];

// Load categories from localStorage
export const loadCategories = (): CategoryHierarchy => {
  try {
    const stored = localStorage.getItem("document_categories");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading categories:", error);
  }
  
  // Return default if nothing found
  return { categories: DEFAULT_CATEGORIES };
};

// Save categories to localStorage
export const saveCategories = (hierarchy: CategoryHierarchy): void => {
  try {
    localStorage.setItem("document_categories", JSON.stringify(hierarchy));
  } catch (error) {
    console.error("Error saving categories:", error);
  }
};

// Generate a unique ID for new categories
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Find a category by ID in the hierarchy
export const findCategoryById = (
  categories: CategoryNode[],
  id: string
): CategoryNode | null => {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    
    if (category.children.length > 0) {
      const found = findCategoryById(category.children, id);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

// Add a new category to the hierarchy
export const addCategory = (
  hierarchy: CategoryHierarchy,
  parentId: string | null,
  name: string
): CategoryHierarchy => {
  const newCategory: CategoryNode = {
    id: generateUniqueId(),
    name,
    children: [],
    parentId
  };
  
  const updatedHierarchy = { ...hierarchy };
  
  if (!parentId) {
    // Add as root category
    updatedHierarchy.categories = [...updatedHierarchy.categories, newCategory];
  } else {
    // Add as child to existing category
    const addChildToParent = (categories: CategoryNode[]): CategoryNode[] => {
      return categories.map(category => {
        if (category.id === parentId) {
          return {
            ...category,
            children: [...category.children, newCategory]
          };
        }
        
        if (category.children.length > 0) {
          return {
            ...category,
            children: addChildToParent(category.children)
          };
        }
        
        return category;
      });
    };
    
    updatedHierarchy.categories = addChildToParent(updatedHierarchy.categories);
  }
  
  return updatedHierarchy;
};

// Remove a category from the hierarchy
export const removeCategory = (
  hierarchy: CategoryHierarchy,
  categoryId: string
): CategoryHierarchy => {
  const updatedHierarchy = { ...hierarchy };
  
  // First check if it's a root category we need to remove
  updatedHierarchy.categories = updatedHierarchy.categories.filter(
    category => category.id !== categoryId
  );
  
  // Also remove it from any potential parent categories (if it wasn't a root)
  const removeFromChildren = (categories: CategoryNode[]): CategoryNode[] => {
    return categories
      .filter(category => category.id !== categoryId)
      .map(category => ({
        ...category,
        children: removeFromChildren(category.children)
      }));
  };
  
  // Apply the filter to all remaining categories
  updatedHierarchy.categories = updatedHierarchy.categories.map(category => ({
    ...category,
    children: removeFromChildren(category.children)
  }));
  
  return updatedHierarchy;
};

// Move a category to a new parent
export const moveCategory = (
  hierarchy: CategoryHierarchy,
  categoryId: string,
  newParentId: string | null
): CategoryHierarchy => {
  // Find the category to move
  const categoryToMove = findCategoryById(hierarchy.categories, categoryId);
  if (!categoryToMove) return hierarchy;
  
  // Remove the category from its current location
  let updatedHierarchy = removeCategory(hierarchy, categoryId);
  
  // Clone the category to move (without its original parent reference)
  const categoryClone: CategoryNode = {
    ...categoryToMove,
    parentId: newParentId
  };
  
  // Add it to the new parent
  if (!newParentId) {
    // Add as root category
    updatedHierarchy.categories = [...updatedHierarchy.categories, categoryClone];
  } else {
    // Add as child to existing category
    const addToNewParent = (categories: CategoryNode[]): CategoryNode[] => {
      return categories.map(category => {
        if (category.id === newParentId) {
          return {
            ...category,
            children: [...category.children, categoryClone]
          };
        }
        
        if (category.children.length > 0) {
          return {
            ...category,
            children: addToNewParent(category.children)
          };
        }
        
        return category;
      });
    };
    
    updatedHierarchy.categories = addToNewParent(updatedHierarchy.categories);
  }
  
  return updatedHierarchy;
};

// Rename a category
export const renameCategory = (
  hierarchy: CategoryHierarchy,
  categoryId: string,
  newName: string
): CategoryHierarchy => {
  const updatedHierarchy = { ...hierarchy };
  
  // Helper function to update node names in a tree structure
  const updateNodeName = (categories: CategoryNode[]): CategoryNode[] => {
    return categories.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          name: newName
        };
      }
      
      if (category.children.length > 0) {
        return {
          ...category,
          children: updateNodeName(category.children)
        };
      }
      
      return category;
    });
  };
  
  updatedHierarchy.categories = updateNodeName(updatedHierarchy.categories);
  return updatedHierarchy;
};
