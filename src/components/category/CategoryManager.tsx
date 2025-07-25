import React, { useState } from "react";
import { Plus, Code, MousePointer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryNode from "./CategoryNode";
import CategoryJsonEditor from "./CategoryJsonEditor";
import { useCategories } from "@/context/CategoryContext";
import { CategoryNode as CategoryNodeType } from "@/types/categories";
import { toast } from "sonner";

const CategoryManager: React.FC = () => {
  const { hierarchy, addNewCategory, deleteCategory, moveNode } = useCategories();
  const [newRootName, setNewRootName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui');

  // Helper function to find a category by ID
  const findCategoryById = (
    categories: CategoryNodeType[],
    id: string
  ): CategoryNodeType | null => {
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

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggingId(nodeId);
    e.dataTransfer.setData("text/plain", nodeId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, newParentId: string | null) => {
    e.preventDefault();
    if (!draggingId || draggingId === newParentId) return;
    
    // Prevent dropping a node into its own descendant
    const isDescendantOfDragged = (parentId: string | null): boolean => {
      if (parentId === draggingId) return true;
      if (!parentId) return false;
      
      const parent = findCategoryById(hierarchy.categories, parentId);
      return parent ? isDescendantOfDragged(parent.parentId) : false;
    };
    
    if (newParentId && isDescendantOfDragged(newParentId)) return;
    
    moveNode(draggingId, newParentId);
    setDraggingId(null);
  };

  const handleAddRoot = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRootName.trim()) {
      addNewCategory(null, newRootName);
      setNewRootName("");
      setIsAddingRoot(false);
      toast.success(`Created "${newRootName}" root category`);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    // Just delete the category - toasts are handled in CategoryNode.tsx
    deleteCategory(categoryId);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingId) {
      moveNode(draggingId, null);
      setDraggingId(null);
    }
  };

  return (
    <Card className="shadow-md" data-category-manager>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Category Hierarchy</span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'ui' ? 'default' : 'ghost'}
                size="sm"
                className="gap-1 rounded-r-none"
                onClick={() => setViewMode('ui')}
              >
                <MousePointer size={16} />
                Drag & Drop
              </Button>
              <Button
                variant={viewMode === 'json' ? 'default' : 'ghost'}
                size="sm"
                className="gap-1 rounded-l-none"
                onClick={() => setViewMode('json')}
              >
                <Code size={16} />
                JSON
              </Button>
            </div>
            {viewMode === 'ui' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={() => setIsAddingRoot(true)}
              >
                <Plus size={16} /> Add Root
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 min-h-[200px]">
        {viewMode === 'json' ? (
          <CategoryJsonEditor />
        ) : (
          <div
            onDragOver={handleRootDragOver}
            onDrop={handleRootDrop}
          >
            {isAddingRoot && (
              <div className="mb-4">
                <form onSubmit={handleAddRoot} className="flex gap-2">
                  <Input
                    value={newRootName}
                    onChange={(e) => setNewRootName(e.target.value)}
                    placeholder="Root category name"
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit">Add</Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsAddingRoot(false)}
                  >
                    Cancel
                  </Button>
                </form>
              </div>
            )}
            
            {hierarchy.categories.length > 0 ? (
              <div className="space-y-2 animate-in fade-in-50 duration-300">
                {hierarchy.categories.map((category, index) => (
                  <div 
                    key={category.id}
                    className="animate-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CategoryNode
                      node={category}
                      onAddChild={(parentId, name) => addNewCategory(parentId, name)}
                      onDelete={handleDeleteCategory}
                      onDragStart={handleDragStart}
                      onDrop={handleDrop}
                      isRoot={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No categories yet. Click 'Add Root' to create your first category, or import from WordPress above.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
