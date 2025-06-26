
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCategories } from '@/context/CategoryContext';
import { CategoryHierarchy } from '@/types/categories';
import { toast } from 'sonner';

const CategoryJsonEditor: React.FC = () => {
  const { hierarchy, addNewCategory, deleteCategory } = useCategories();
  const [jsonValue, setJsonValue] = useState('');
  const [isValid, setIsValid] = useState(true);

  // Update JSON value when hierarchy changes
  useEffect(() => {
    setJsonValue(JSON.stringify(hierarchy, null, 2));
  }, [hierarchy]);

  const validateJson = (value: string): boolean => {
    try {
      const parsed = JSON.parse(value);
      
      // Basic validation - check if it has the required structure
      if (!parsed || typeof parsed !== 'object') {
        return false;
      }
      
      if (!Array.isArray(parsed.categories)) {
        return false;
      }
      
      // Validate each category has required fields
      const validateCategory = (category: any): boolean => {
        return (
          typeof category.id === 'string' &&
          typeof category.name === 'string' &&
          Array.isArray(category.children) &&
          (category.parentId === null || typeof category.parentId === 'string')
        );
      };
      
      const validateCategoryTree = (categories: any[]): boolean => {
        for (const category of categories) {
          if (!validateCategory(category)) {
            return false;
          }
          if (category.children.length > 0 && !validateCategoryTree(category.children)) {
            return false;
          }
        }
        return true;
      };
      
      return validateCategoryTree(parsed.categories);
    } catch {
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setIsValid(validateJson(value));
  };

  const handleApplyChanges = () => {
    if (!isValid) {
      toast.error('Invalid JSON format. Please check your syntax.');
      return;
    }

    try {
      const newHierarchy: CategoryHierarchy = JSON.parse(jsonValue);
      
      // Clear existing categories and rebuild from JSON
      // Note: This is a simplified approach - in a real app you might want more sophisticated merging
      const currentCategories = [...hierarchy.categories];
      
      // Delete all existing categories first
      currentCategories.forEach(category => {
        deleteCategory(category.id);
      });
      
      // Add new categories from JSON
      // We'll need to add them in the right order (parents before children)
      const addCategoriesRecursively = (categories: any[], parentId: string | null = null) => {
        categories.forEach(category => {
          addNewCategory(parentId, category.name);
          if (category.children && category.children.length > 0) {
            // For simplicity, we'll use setTimeout to ensure parent is created first
            setTimeout(() => {
              addCategoriesRecursively(category.children, category.id);
            }, 100);
          }
        });
      };

      addCategoriesRecursively(newHierarchy.categories);
      toast.success('Categories updated from JSON');
    } catch (error) {
      toast.error('Failed to apply JSON changes');
      console.error('JSON apply error:', error);
    }
  };

  const handleReset = () => {
    setJsonValue(JSON.stringify(hierarchy, null, 2));
    setIsValid(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">JSON Category Editor</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button 
            size="sm" 
            onClick={handleApplyChanges}
            disabled={!isValid}
          >
            Apply Changes
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Textarea
          value={jsonValue}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder="Edit your category structure as JSON..."
          className={`min-h-[400px] font-mono text-sm ${
            !isValid ? 'border-red-500 focus:border-red-500' : ''
          }`}
        />
        
        {!isValid && (
          <p className="text-sm text-red-600">
            Invalid JSON format. Please ensure your JSON follows the correct category structure.
          </p>
        )}
        
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Format:</strong> Each category needs id, name, children (array), and parentId (string or null)</p>
          <p><strong>Tip:</strong> You can copy this JSON to backup your categories or import from another system</p>
        </div>
      </div>
    </div>
  );
};

export default CategoryJsonEditor;
