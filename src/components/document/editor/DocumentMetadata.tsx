
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PDFViewerModal } from '@/components/ui/pdf-viewer-modal';
import { Tag, BookCopy, FolderOpen, ChevronRight, AlertTriangle, Building, CheckSquare, Square, FileText, Eye, Trash2 } from 'lucide-react';
import { DocumentFile } from '@/types/document';
import { useCategories } from '@/context/CategoryContext';
import { CategoryNode } from '@/types/categories';
import { fetchWordPressTaxonomies } from '@/utils/wordpressUtils';

interface DocumentMetadataProps {
  document: DocumentFile;
  isGeneratingAI: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  onGenerateCategory?: () => void;
  onGenerateTags?: () => void;
  onGenerateScheme?: () => void;
  onDelete?: () => void;
}

const DocumentMetadata: React.FC<DocumentMetadataProps> = ({
  document,
  isGeneratingAI,
  onEdit,
  onGenerateCategory,
  onGenerateTags,
  onGenerateScheme,
  onDelete
}) => {
  const { hierarchy } = useCategories();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSchemePopoverOpen, setIsSchemePopoverOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [nsiSchemes, setNsiSchemes] = useState<string[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);

  // Fetch NSI schemes from WordPress taxonomy with fallback
  useEffect(() => {
    const loadNsiSchemes = async () => {
      setIsLoadingSchemes(true);
      try {
        const schemes = await fetchWordPressTaxonomies('nsi-scheme');
        const schemeNames = schemes.map(scheme => scheme.name);
        setNsiSchemes(schemeNames);
      } catch (error) {
        console.error('Failed to fetch NSI schemes:', error);
        // Fallback to common NSI schemes if WordPress is not configured
        setNsiSchemes([
          'ARC',
          'Cash Services',
          'EMS',
          'Evacuation Alert Systems',
          'Fire',
          'Guarding',
          'Health and Safety',
          'Kitchen Fire Protection Systems',
          'Life Safety Fire Risk Assessment',
          'NACOSS',
          'Specialist Services'
        ]);
      } finally {
        setIsLoadingSchemes(false);
      }
    };

    loadNsiSchemes();
  }, []);

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

  const handleSchemeToggle = (scheme: string) => {
    const currentSchemes = document.customTaxonomies?.['tax:nsi-scheme'] || '';
    const schemesArray = currentSchemes.split(',').map(s => s.trim()).filter(Boolean);
    
    if (schemesArray.includes(scheme)) {
      // Remove scheme
      const updatedSchemes = schemesArray.filter(s => s !== scheme);
      const updatedTaxonomies = { ...document.customTaxonomies, 'tax:nsi-scheme': updatedSchemes.join(', ') };
      onEdit('customTaxonomies', updatedTaxonomies as any);
    } else {
      // Add scheme
      const updatedSchemes = [...schemesArray, scheme];
      const updatedTaxonomies = { ...document.customTaxonomies, 'tax:nsi-scheme': updatedSchemes.join(', ') };
      onEdit('customTaxonomies', updatedTaxonomies as any);
    }
  };

  const isSchemeSelected = (scheme: string) => {
    const currentSchemes = document.customTaxonomies?.['tax:nsi-scheme'] || '';
    const schemesArray = currentSchemes.split(',').map(s => s.trim()).filter(Boolean);
    return schemesArray.includes(scheme);
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
  
  // Check for incomplete metadata
  const isCategoriesEmpty = !document.categories || document.categories.trim() === '' || isUncategorised;
  const isSchemesEmpty = !document.customTaxonomies?.['tax:nsi-scheme'] || document.customTaxonomies['tax:nsi-scheme'].trim() === '';
  const isTagsEmpty = !document.tags || document.tags.trim() === '';
  
  // Check if PDF viewing is available - either from URL or file object
  const hasPdfUrl = (document.fileUrl && document.fileType === 'application/pdf') || 
                    (document.file && document.file.type === 'application/pdf');

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
            className={isCategoriesEmpty ? "border-red-500 text-red-600 pr-10" : ""}
          />
          {isCategoriesEmpty && (
            <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        {isCategoriesEmpty && (
          <p className="text-xs text-red-500 mt-1">⚠️ This document needs a category assignment</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Use &gt; for category hierarchy (e.g., Policies &gt; HR)</p>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium">Scheme(s)</label>
            <Popover open={isSchemePopoverOpen} onOpenChange={setIsSchemePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Building className="mr-2 h-4 w-4" />
                  Select
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm mb-2">Select NSI Schemes</h4>
                  <p className="text-xs text-muted-foreground mb-3">Select multiple schemes</p>
                  {isLoadingSchemes ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                      Loading schemes...
                    </div>
                  ) : nsiSchemes.length > 0 ? (
                    nsiSchemes.map((scheme) => (
                      <Button
                        key={scheme}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-8 px-2"
                        onClick={() => handleSchemeToggle(scheme)}
                      >
                        {isSchemeSelected(scheme) ? (
                          <CheckSquare className="mr-2 h-3 w-3 text-blue-600" />
                        ) : (
                          <Square className="mr-2 h-3 w-3" />
                        )}
                        {scheme}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No NSI schemes found in WordPress taxonomy</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
        <div className="relative">
          <Input 
            value={document.customTaxonomies?.['tax:nsi-scheme'] || ''}
            onChange={(e) => {
              const updatedTaxonomies = { ...document.customTaxonomies, 'tax:nsi-scheme': e.target.value };
              onEdit('customTaxonomies', updatedTaxonomies as any);
            }}
            placeholder="E.g., Building Regulations, Health & Safety"
            title="The scheme this document belongs to"
            className={isSchemesEmpty ? "border-red-500 text-red-600 pr-10" : ""}
          />
          {isSchemesEmpty && (
            <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        {isSchemesEmpty && (
          <p className="text-xs text-red-500 mt-1">⚠️ This document needs a scheme assignment</p>
        )}
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
        <div className="relative">
          <Input 
            value={document.tags}
            onChange={(e) => onEdit('tags', e.target.value)}
            placeholder="E.g., Important, Confidential"
            title="Separate tags with commas"
            className={isTagsEmpty ? "border-red-500 text-red-600 pr-10" : ""}
          />
          {isTagsEmpty && (
            <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
          )}
        </div>
        {isTagsEmpty && (
          <p className="text-xs text-red-500 mt-1">⚠️ This document needs tags</p>
        )}
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

      {hasPdfUrl && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Document Viewer</label>
          <Button 
            variant="outline" 
            onClick={() => setIsPdfModalOpen(true)}
            className="w-full"
          >
            <Eye className="mr-2 h-4 w-4" />
            View PDF Document
          </Button>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center">
          <Switch 
            checked={!!document.omitFromCSV}
            onCheckedChange={(checked) => onEdit('omitFromCSV', checked)}
            id="omitFromCSV"
          />
          <label htmlFor="omitFromCSV" className="ml-2 text-sm font-medium">
            Omit Document from CSV
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">When enabled, this document will be excluded from CSV generation</p>
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

      {onDelete && (
        <div className="mb-4">
          <Button 
            variant="destructive" 
            onClick={onDelete}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Document
          </Button>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={document.fileUrl}
        pdfFile={document.file}
        fileName={document.name}
      />
    </div>
  );
};

export default DocumentMetadata;
