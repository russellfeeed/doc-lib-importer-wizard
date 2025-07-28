import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Eye, EyeOff, Globe, Lock, User, Code, AlertTriangle } from 'lucide-react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useCategories } from '@/context/CategoryContext';
import { CategoryHierarchy } from '@/types/categories';
import { toast } from 'sonner';

interface WordPressCredentials {
  url: string;
  username: string;
  password: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  parent: number;
  count: number;
}

type ImportAction = 'erase' | 'merge' | null;

const WordPressImporter: React.FC = () => {
  const { addNewCategory, hierarchy, clearAllCategories, replaceAllCategories } = useCategories();
  const [credentials, setCredentials] = useState<WordPressCredentials>(() => {
    const saved = localStorage.getItem('wp_credentials');
    return saved ? JSON.parse(saved) : { url: 'https://dev.members.nsi.org.uk/', username: '', password: '' };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wpCategories, setWpCategories] = useState<WordPressCategory[]>([]);
  const [showJson, setShowJson] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importAction, setImportAction] = useState<ImportAction>(null);

  const saveCredentials = (newCredentials: WordPressCredentials) => {
    setCredentials(newCredentials);
    localStorage.setItem('wp_credentials', JSON.stringify(newCredentials));
  };

  const fetchWordPressCategories = async () => {
    if (!credentials.url || !credentials.username || !credentials.password) {
      toast.error('Please fill in all WordPress credentials');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the Supabase edge function instead of direct WordPress API call
      const requestBody: any = {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        per_page: 100,
        fields: 'id,name,parent,count'
      };


      const response = await fetch('https://tcdkvxorsyqsrxolxoni.supabase.co/functions/v1/wordpress-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const categories: WordPressCategory[] = await response.json();
      setWpCategories(categories);
      
      if (categories.length === 0) {
        toast.warning('No categories found in WordPress doc_categories taxonomy');
      } else {
        toast.success(`Found ${categories.length} categories from WordPress`);
      }
    } catch (error) {
      console.error('Error fetching WordPress categories:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to fetch categories: ${errorMessage}`);
      setWpCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportClick = () => {
    if (wpCategories.length === 0) {
      toast.error('No categories to import. Please fetch categories first.');
      return;
    }

    // Check if there are existing categories
    const hasExistingCategories = hierarchy.categories.length > 0;
    
    if (hasExistingCategories) {
      setShowImportDialog(true);
    } else {
      // No existing categories, proceed with import
      performImport('merge');
    }
  };

  const performImport = async (action: 'erase' | 'merge') => {
    try {
      console.log('🚀 Starting import process with action:', action);
      console.log('📊 Current hierarchy before import:', hierarchy);
      
      // Build the complete new hierarchy structure
      let newHierarchy: CategoryHierarchy;
      
      if (action === 'erase') {
        // Start with empty hierarchy
        newHierarchy = { categories: [] };
        console.log('🧹 Starting with empty hierarchy for erase action');
      } else {
        // Start with existing hierarchy for merge
        newHierarchy = { 
          categories: JSON.parse(JSON.stringify(hierarchy.categories)) // Deep copy
        };
        console.log('🔄 Starting with existing hierarchy for merge action');
      }

      const categoryMap = new Map<number, string>(); // WordPress ID -> Local ID mapping
      const processedCategories = new Set<number>(); // Track processed categories
      
      // Function to build category hierarchy locally
      const buildCategory = (wpCategory: WordPressCategory, parentId: string | null = null): string => {
        // If already processed, return the existing local ID
        if (processedCategories.has(wpCategory.id)) {
          return categoryMap.get(wpCategory.id)!;
        }
        
        let actualParentId: string | null = null;
        
        // If this category has a parent, ensure the parent is built first
        if (wpCategory.parent !== 0) {
          const parentCategory = wpCategories.find(cat => cat.id === wpCategory.parent);
          if (parentCategory) {
            actualParentId = buildCategory(parentCategory);
          }
        }
        
        // Generate a unique ID for this category
        const localId = `wp_${wpCategory.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create the category object
        const newCategory = {
          id: localId,
          name: wpCategory.name,
          children: [] as any[],
          parentId: actualParentId
        };
        
        console.log(`🏗️ Building WordPress category: ${wpCategory.name} with ID: ${localId} under parent: ${actualParentId || 'root'}`);
        
        // Add to the appropriate location in hierarchy
        if (actualParentId === null) {
          // Root category
          newHierarchy.categories.push(newCategory);
        } else {
          // Find parent and add as child
          const addToParent = (categories: any[], targetParentId: string) => {
            for (const cat of categories) {
              if (cat.id === targetParentId) {
                cat.children.push(newCategory);
                return true;
              }
              if (cat.children.length > 0 && addToParent(cat.children, targetParentId)) {
                return true;
              }
            }
            return false;
          };
          addToParent(newHierarchy.categories, actualParentId);
        }
        
        categoryMap.set(wpCategory.id, localId);
        processedCategories.add(wpCategory.id);
        
        return localId;
      };
      
      // Process all categories (recursive function will handle the hierarchy)
      for (const category of wpCategories) {
        if (!processedCategories.has(category.id)) {
          buildCategory(category);
        }
      }
      
      // Replace the entire hierarchy in one atomic operation
      console.log('🔄 Replacing entire hierarchy with new structure:', newHierarchy);
      replaceAllCategories(newHierarchy);

      const actionText = action === 'erase' ? 'replaced existing categories and imported' : 'imported';
      toast.success(`Successfully ${actionText} ${wpCategories.length} categories! Check the Category Manager below to see them.`);
      setWpCategories([]); // Clear the preview after import
      setShowImportDialog(false);
      setImportAction(null);
      
      // Scroll to the category manager to show the imported categories
      setTimeout(() => {
        const categoryManager = document.querySelector('[data-category-manager]');
        if (categoryManager) {
          categoryManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (error) {
      console.error('Error importing categories:', error);
      toast.error('Failed to import categories');
    }
  };

  const handleImportConfirm = () => {
    if (importAction) {
      performImport(importAction);
    }
  };

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            WordPress Category Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="wp-url" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                WordPress Site URL
              </Label>
              <Input
                id="wp-url"
                placeholder="https://yoursite.com"
                value={credentials.url}
                onChange={(e) => saveCredentials({ ...credentials, url: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="wp-username" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="wp-username"
                placeholder="WordPress username"
                value={credentials.username}
                onChange={(e) => saveCredentials({ ...credentials, username: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="wp-password" className="flex items-center gap-1">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="wp-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="WordPress password"
                  value={credentials.password}
                  onChange={(e) => saveCredentials({ ...credentials, password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={fetchWordPressCategories}
              disabled={isLoading || !credentials.url || !credentials.username || !credentials.password}
              className="flex-1"
            >
              {isLoading ? 'Fetching...' : 'Fetch Categories'}
            </Button>
            
            {wpCategories.length > 0 && (
              <Button 
                onClick={handleImportClick}
                variant="outline"
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Import ({wpCategories.length})
              </Button>
            )}
          </div>

          {wpCategories.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Preview: Categories to Import</h4>
                <div className="max-h-32 overflow-y-auto border rounded p-2 text-sm">
                  {(() => {
                    // Function to build tree structure and render with proper indentation
                    const renderCategoryTree = (categories: WordPressCategory[], parentId: number = 0, level: number = 0): JSX.Element[] => {
                      return categories
                        .filter(cat => cat.parent === parentId)
                        .map(cat => (
                          <div key={cat.id}>
                            <div 
                              className={`py-1 ${level > 0 ? 'text-muted-foreground' : ''}`}
                              style={{ paddingLeft: `${level * 16}px` }}
                            >
                              {level > 0 && '└─ '}{cat.name} ({cat.count} items)
                            </div>
                            {renderCategoryTree(categories, cat.id, level + 1)}
                          </div>
                        ));
                    };
                    
                    return renderCategoryTree(wpCategories);
                  })()}
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowJson(!showJson)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Code className="h-4 w-4" />
                    {showJson ? 'Hide' : 'Show'} Raw JSON
                  </Button>
                </div>
                
                {showJson && (
                  <div className="mt-2">
                    <div className="max-h-64 overflow-y-auto border rounded p-3 bg-muted/50">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {JSON.stringify(wpCategories, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground space-y-2">
            <div>
              <p className="font-medium">Requirements:</p>
              <p>• Credentials are stored locally in your browser</p>
              <p>• Requires WordPress user with appropriate permissions</p>
              <p>• Fetches from doc_categories taxonomy (Document Library Plugin)</p>
              <p>• Uses secure Supabase proxy to avoid CORS issues</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Import Categories
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have {hierarchy.categories.length} existing categories. How would you like to proceed with importing {wpCategories.length} categories from WordPress?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-4">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="merge"
                name="import-action"
                value="merge"
                checked={importAction === 'merge'}
                onChange={() => setImportAction('merge')}
                className="mt-1"
              />
              <div>
                <label htmlFor="merge" className="font-medium cursor-pointer">
                  Keep existing and merge
                </label>
                <p className="text-sm text-muted-foreground">
                  Add WordPress categories alongside your existing ones
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="erase"
                name="import-action"
                value="erase"
                checked={importAction === 'erase'}
                onChange={() => setImportAction('erase')}
                className="mt-1"
              />
              <div>
                <label htmlFor="erase" className="font-medium cursor-pointer text-red-600">
                  Clear existing and replace
                </label>
                <p className="text-sm text-muted-foreground">
                  Remove all existing categories and replace with WordPress categories
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImportAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleImportConfirm}
              disabled={!importAction}
            >
              Import Categories
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WordPressImporter;
