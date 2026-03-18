
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Edit, Zap, Tag, Building } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentHeaderProps {
  currentDocIndex: number;
  totalDocuments: number;
  isGeneratingAI: boolean;
  onGenerateAllExcerpts: (selectedIndices?: Set<number>) => void;
  onGenerateAllCategories?: (selectedIndices?: Set<number>) => void;
  onGenerateAllTags?: (selectedIndices?: Set<number>) => void;
  onGenerateAllSchemes?: (selectedIndices?: Set<number>) => void;
  onToggleView: () => void;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  currentDocIndex,
  totalDocuments,
  isGeneratingAI,
  onGenerateAllExcerpts,
  onGenerateAllCategories,
  onGenerateAllTags,
  onGenerateAllSchemes,
  onToggleView
}) => {
  return (
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold flex items-center">
        <FileText className="mr-2" />
        Document {currentDocIndex + 1} of {totalDocuments}
      </h3>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onGenerateAllExcerpts}
          disabled={isGeneratingAI}
        >
          <Zap className="mr-2 h-4 w-4" />
          Generate All Excerpts
        </Button>
        {onGenerateAllCategories && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onGenerateAllCategories}
            disabled={isGeneratingAI}
          >
            <Tag className="mr-2 h-4 w-4" />
            Categorize All
          </Button>
        )}
        {onGenerateAllTags && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onGenerateAllTags}
            disabled={isGeneratingAI}
          >
            <Tag className="mr-2 h-4 w-4" />
            Tag All
          </Button>
        )}
        {onGenerateAllSchemes && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onGenerateAllSchemes}
            disabled={isGeneratingAI}
          >
            <Building className="mr-2 h-4 w-4" />
            Detect All Schemes
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToggleView}
        >
          <Edit className="mr-2 h-4 w-4" />
          View All Documents
        </Button>
      </div>
    </div>
  );
};

export default DocumentHeader;
