
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import CategoryManager from '@/components/category/CategoryManager';
import WordPressImporter from '@/components/category/WordPressImporter';
import { useCategories } from '@/context/CategoryContext';
import { toast } from 'sonner';

// This component is now optional - it only adds Circular Letters if it doesn't exist on first load
const CategoryInitializer: React.FC = () => {
  const { hierarchy, addNewCategory } = useCategories();
  const [initialized, setInitialized] = React.useState(false);

  // Check if "Circular Letters" category already exists, but only on first load
  React.useEffect(() => {
    // Only run once and only if hierarchy and categories are ready
    if (initialized || !hierarchy || !hierarchy.categories) return;
    
    const circularLettersCategoryExists = hierarchy.categories.some(
      category => category.name === "Circular Letters"
    );

    // If not, create it, but only on first load (not after deletion)
    if (!circularLettersCategoryExists) {
      addNewCategory(null, "Circular Letters");
      toast.success('Created "Circular Letters" category');
      
      // Create some default subcategories for Circular Letters
      setTimeout(() => {
        // Find the newly created category ID
        const circularLettersCategory = hierarchy.categories.find(
          category => category.name === "Circular Letters"
        );
        
        if (circularLettersCategory) {
          // Add subcategories without showing toasts from here
          addNewCategory(circularLettersCategory.id, "Announcements");
          addNewCategory(circularLettersCategory.id, "Policies");
          addNewCategory(circularLettersCategory.id, "Updates");
          addNewCategory(circularLettersCategory.id, "Requirements");
        }
      }, 500); // Small delay to ensure the parent category is saved first
    }
    
    setInitialized(true);
  }, [hierarchy, addNewCategory, initialized]);

  return null;
};

const Categories: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Document Categories</h1>
      <p className="text-gray-600 mb-8">
        Create and manage document categories for better organization and easier retrieval.
      </p>
      
      <CategoryInitializer />
      
      <div className="space-y-6">
        <WordPressImporter />
        <CategoryManager />
      </div>
    </div>
  );
};

export default Categories;
