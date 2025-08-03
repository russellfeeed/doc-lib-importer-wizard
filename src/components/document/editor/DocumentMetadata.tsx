
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, BookCopy, FolderOpen, ChevronRight, AlertTriangle, Building } from 'lucide-react';
import { DocumentFile } from '@/types/document';
import { useCategories } from '@/context/CategoryContext';
import { CategoryNode } from '@/types/categories';

interface DocumentMetadataProps {
  document: DocumentFile;
  isGeneratingAI: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  onGenerateCategory?: () => void;
  onGenerateTags?: () => void;
  onGenerateScheme?: () => void;
}

const DocumentMetadata: React.FC<DocumentMetadataProps> = ({
  document,
  isGeneratingAI,
  onEdit,
  onGenerateCategory,
  onGenerateTags,
  onGenerateScheme
}) => {
  const { hierarchy } = useCategories();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const buildCategoryPath = (categoryId: string, categories: CategoryNode[]): string => {
    const findCategoryPath = (id: string, nodes: CategoryNode[], path: string[] = []): string[] | null => {
      for (const node of nodes) {
        if (node.id === id) {
          return [...path, node.name];
        }
        if (node.children.length > 0) {
          const result = findCategoryPath(id, node.children, [...path, node.name]);
          if (result) return result;
        }
      }
      return null;
    };
    
    const path = findCategoryPath(categoryId, categories);
    return path ? path.join(' > ') : '';
  };

  const handleCategorySelect = (categoryId: string) => {
    const categoryPath = buildCategoryPath(categoryId, hierarchy.categories);
    onEdit('categories', categoryPath);
    setIsPopoverOpen(false);
  };

  const renderCategoryTree = (categories: CategoryNode[], level = 0) => {
    return categories.map((category) => (
      <div key={category.id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-left h-8 px-2"
          onClick={() => handleCategorySelect(category.id)}
        >
          <FolderOpen className="mr-2 h-3 w-3" />
          {category.name}
        </Button>
        {category.children.length > 0 && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  const isUncategorised = document.categories.toLowerCase() === 'uncategorised' || 
                         document.categories.toLowerCase() === 'uncategorized';

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Document Name</label>
        <Input 
          value={document.name}
          onChange={(e) => onEdit('name', e.target.value)}
          placeholder="Enter document name"
        />
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium">Categories</label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Select
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm mb-2">Select Category</h4>
                  {hierarchy.categories.length > 0 ? (
                    renderCategoryTree(hierarchy.categories)
                  ) : (
                    <p className="text-sm text-muted-foreground">No categories available</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {onGenerateCategory && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerateCategory}
              disabled={isGeneratingAI}
              className={document.aiProcessing?.status === 'processing' ? "opacity-50" : ""}
            >
              {document.aiProcessing?.status === 'processing' ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <BookCopy className="mr-2 h-4 w-4" /> 
                  Detect Category
                </>
              )}
            </Button>
          )}
        </div>
        <div className="relative">
          <Input 
            value={document.categories}
            onChange={(e) => onEdit('categories', e.target.value)}
            placeholder="E.g., Policies > HR"
            title="Use > to denote category hierarchy"
            className={isUncategorised ? "border-red-500 text-red-600 pr-10" : ""}
          />
          {isUncategorised && (
            <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Use &gt; for category hierarchy (e.g., Policies &gt; HR)</p>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium">Scheme(s)</label>
          {onGenerateScheme && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerateScheme}
              disabled={isGeneratingAI}
              className={document.aiProcessing?.status === 'processing' ? "opacity-50" : ""}
            >
              {document.aiProcessing?.status === 'processing' ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Building className="mr-2 h-4 w-4" /> 
                  Detect Scheme
                </>
              )}
            </Button>
          )}
        </div>
        <Input 
          value={document.customTaxonomies?.['tax:nsi-scheme'] || ''}
          onChange={(e) => {
            const updatedTaxonomies = { ...document.customTaxonomies, 'tax:nsi-scheme': e.target.value };
            onEdit('customTaxonomies', updatedTaxonomies as any);
          }}
          placeholder="E.g., Building Regulations, Health & Safety"
          title="The scheme this document belongs to"
        />
        <p className="text-xs text-gray-500 mt-1">The compliance scheme this document relates to</p>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium">Tags</label>
          {onGenerateTags && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerateTags}
              disabled={isGeneratingAI}
              className={document.aiProcessing?.status === 'processing' ? "opacity-50" : ""}
            >
              {document.aiProcessing?.status === 'processing' ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" /> 
                  Generate Tags
                </>
              )}
            </Button>
          )}
        </div>
        <Input 
          value={document.tags}
          onChange={(e) => onEdit('tags', e.target.value)}
          placeholder="E.g., Important, Confidential"
          title="Separate tags with commas"
        />
        <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Authors</label>
        <Input 
          value={document.authors}
          onChange={(e) => onEdit('authors', e.target.value)}
          placeholder="E.g., John Smith, Jane Doe"
          title="Separate authors with commas"
        />
        <p className="text-xs text-gray-500 mt-1">Separate multiple authors with commas</p>
      </div>

      <div className="mb-4">
        <div className="flex items-center">
          <Switch 
            checked={document.published}
            onCheckedChange={(checked) => onEdit('published', checked)}
            id="published"
          />
          <label htmlFor="published" className="ml-2 text-sm font-medium">
            Published
          </label>
        </div>
      </div>
    </div>
  );
};

export default DocumentMetadata;
