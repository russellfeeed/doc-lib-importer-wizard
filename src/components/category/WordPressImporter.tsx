import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Eye, EyeOff, Globe, Lock, User } from 'lucide-react';
import { useCategories } from '@/context/CategoryContext';
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

const WordPressImporter: React.FC = () => {
  const { addNewCategory } = useCategories();
  const [credentials, setCredentials] = useState<WordPressCredentials>(() => {
    const saved = localStorage.getItem('wp_credentials');
    return saved ? JSON.parse(saved) : { url: '', username: '', password: '' };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wpCategories, setWpCategories] = useState<WordPressCategory[]>([]);

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
      const response = await fetch('https://tcdkvxorsyqsrxolxoni.supabase.co/functions/v1/wordpress-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: credentials.url,
          username: credentials.username,
          password: credentials.password,
          per_page: 100,
          fields: 'id,name,parent,count'
        }),
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

  const importCategories = async () => {
    if (wpCategories.length === 0) {
      toast.error('No categories to import. Please fetch categories first.');
      return;
    }

    try {
      // First, create all parent categories (those with parent = 0)
      const parentCategories = wpCategories.filter(cat => cat.parent === 0);
      const categoryMap = new Map<number, string>(); // WordPress ID -> Local ID mapping
      
      for (const parentCat of parentCategories) {
        const localId = addNewCategory(null, parentCat.name);
        categoryMap.set(parentCat.id, localId);
      }
      
      // Then create child categories
      const childCategories = wpCategories.filter(cat => cat.parent !== 0);
      
      for (const childCat of childCategories) {
        const parentLocalId = categoryMap.get(childCat.parent);
        if (parentLocalId) {
          addNewCategory(parentLocalId, childCat.name);
        } else {
          // If parent not found, create as root category
          addNewCategory(null, childCat.name);
        }
      }

      toast.success(`Successfully imported ${wpCategories.length} categories from WordPress`);
      setWpCategories([]); // Clear the preview after import
    } catch (error) {
      console.error('Error importing categories:', error);
      toast.error('Failed to import categories');
    }
  };

  return (
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
              onClick={importCategories}
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
                {wpCategories.map((cat) => (
                  <div key={cat.id} className={`py-1 ${cat.parent !== 0 ? 'pl-4 text-muted-foreground' : ''}`}>
                    {cat.parent !== 0 && '└─ '}{cat.name} ({cat.count} items)
                  </div>
                ))}
              </div>
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
  );
};

export default WordPressImporter;