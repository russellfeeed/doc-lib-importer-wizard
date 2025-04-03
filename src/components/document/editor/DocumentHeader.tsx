
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Edit, Zap, Tag } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentHeaderProps {
  currentDocIndex: number;
  totalDocuments: number;
  isGeneratingAI: boolean;
  onGenerateAllExcerpts: () => void;
  onGenerateAllCategories?: () => void;
  onToggleView: () => void;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  currentDocIndex,
  totalDocuments,
  isGeneratingAI,
  onGenerateAllExcerpts,
  onGenerateAllCategories,
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
