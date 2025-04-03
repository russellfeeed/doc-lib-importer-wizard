
import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentMetadataProps {
  document: DocumentFile;
  isGeneratingAI: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean) => void;
  onGenerateCategory?: () => void;
}

const DocumentMetadata: React.FC<DocumentMetadataProps> = ({
  document,
  isGeneratingAI,
  onEdit,
  onGenerateCategory
}) => {
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
          <label className="block text-sm font-medium">Categories</label>
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
                  <Tag className="mr-2 h-4 w-4" /> 
                  Detect Category
                </>
              )}
            </Button>
          )}
        </div>
        <Input 
          value={document.categories}
          onChange={(e) => onEdit('categories', e.target.value)}
          placeholder="E.g., Policies > HR"
          title="Use > to denote category hierarchy"
        />
        <p className="text-xs text-gray-500 mt-1">Use &gt; for category hierarchy (e.g., Policies &gt; HR)</p>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Tags</label>
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
