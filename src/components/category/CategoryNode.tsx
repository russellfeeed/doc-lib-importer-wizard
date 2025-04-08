
import React, { useState, useRef } from "react";
import { Plus, Trash2, ChevronRight, ChevronDown, GripVertical, Edit, Check } from "lucide-react";
import { CategoryNode as CategoryNodeType } from "@/types/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/context/CategoryContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryNodeProps {
  node: CategoryNodeType;
  onAddChild: (parentId: string, name: string) => void;
  onDelete: (categoryId: string) => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDrop: (e: React.DragEvent, nodeId: string | null) => void;
  isRoot?: boolean;
  level?: number;
}

const CategoryNode: React.FC<CategoryNodeProps> = ({
  node,
  onAddChild,
  onDelete,
  onDragStart,
  onDrop,
  isRoot = false,
  level = 0
}) => {
  const { updateCategoryName, hierarchy } = useCategories();
  const [expanded, setExpanded] = useState(true);
  const [newChildName, setNewChildName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(node.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const isOnlyRootCategory = isRoot && hierarchy.categories.length <= 1;

  const handleAddClick = () => {
    setIsAdding(true);
  };

  const handleSubmitNewChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChildName.trim()) {
      onAddChild(node.id, newChildName);
      setNewChildName("");
      setIsAdding(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedName(node.name);
  };

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName !== node.name) {
      updateCategoryName(node.id, editedName);
      setIsEditing(false);
      toast.success(`Successfully renamed to "${editedName}"`);
    } else if (editedName === node.name) {
      setIsEditing(false);
    } else {
      setEditedName(node.name);
      setIsEditing(false);
      toast.error("Category name cannot be empty");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditedName(node.name);
      setIsEditing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(e, node.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeRef.current) {
      nodeRef.current.classList.add("bg-blue-100");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeRef.current) {
      nodeRef.current.classList.remove("bg-blue-100");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nodeRef.current) {
      nodeRef.current.classList.remove("bg-blue-100");
    }
    onDrop(e, node.id);
  };

  const handleDeleteConfirm = () => {
    // First close the dialog, then delete the category
    setDeleteDialogOpen(false);
    // Now actually delete the category and show the success toast
    onDelete(node.id);
    toast.success(`Deleted "${node.name}" category`);
  };

  const padding = level * 20;

  return (
    <div className="category-node">
      <div
        ref={nodeRef}
        className="flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors"
        style={{ paddingLeft: `${padding}px` }}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="cursor-move mr-2 text-gray-400">
          <GripVertical size={16} />
        </div>
        
        {node.children.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 mr-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </Button>
        )}
        
        {node.children.length === 0 && <div className="w-7"></div>}
        
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="h-7 py-1 text-sm"
              autoFocus
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
              onClick={handleSaveEdit}
            >
              <Check size={16} />
            </Button>
          </div>
        ) : (
          <span className="flex-1 font-medium">{node.name}</span>
        )}
        
        {!isEditing && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              onClick={handleEditClick}
            >
              <Edit size={16} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              onClick={handleAddClick}
            >
              <Plus size={16} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isOnlyRootCategory}
              title={isOnlyRootCategory ? "Cannot delete the only root category" : "Delete category"}
            >
              <Trash2 size={16} />
            </Button>
          </>
        )}
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{node.name}" category{node.children.length > 0 ? " and all its subcategories" : ""}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {isAdding && (
        <div 
          className="mt-1 mb-2 pl-2 flex items-center"
          style={{ paddingLeft: `${padding + 24}px` }}
        >
          <form onSubmit={handleSubmitNewChild} className="flex gap-2 items-center flex-1">
            <Input
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Category name"
              className="h-8 text-sm flex-1"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8">
              Add
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
          </form>
        </div>
      )}
      
      {expanded && node.children.length > 0 && (
        <div className="children">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDrop={onDrop}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryNode;
