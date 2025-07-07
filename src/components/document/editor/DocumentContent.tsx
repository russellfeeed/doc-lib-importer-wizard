
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentContentProps {
  document: DocumentFile;
  isGeneratingAI: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean) => void;
  onGenerateExcerpt: () => void;
}

const DocumentContent: React.FC<DocumentContentProps> = ({
  document,
  isGeneratingAI,
  onEdit,
  onGenerateExcerpt
}) => {
  return (
    <div>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium">Excerpt / Summary</label>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onGenerateExcerpt}
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
                <Zap className="mr-2 h-4 w-4" /> 
                Generate with AI
              </>
            )}
          </Button>
        </div>
        <Textarea 
          value={document.excerpt}
          onChange={(e) => onEdit('excerpt', e.target.value)}
          placeholder="Brief summary of the document"
          rows={4}
        />
        {document.aiProcessing?.status === 'completed' && (
          <p className="text-xs text-green-500 mt-1">
            <Zap className="inline h-3 w-3 mr-1" />
            AI-generated summary
          </p>
        )}
        {document.aiProcessing?.status === 'error' && (
          <p className="text-xs text-red-500 mt-1">
            Error generating AI summary
          </p>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">File URL</label>
        <Input 
          value={document.fileUrl || `https://dev.members.nsi.org.uk/wp-content/uploads/2025/07/${document.name}`}
          onChange={(e) => onEdit('fileUrl', e.target.value)}
          placeholder={`https://dev.members.nsi.org.uk/wp-content/uploads/2025/07/${document.name}`}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Direct URL</label>
        <Input 
          value={document.directUrl || `https://dev.members.nsi.org.uk/wp-content/uploads/2025/07/${document.name}`}
          onChange={(e) => onEdit('directUrl', e.target.value)}
          placeholder={`https://dev.members.nsi.org.uk/wp-content/uploads/2025/07/${document.name}`}
        />
      </div>
    </div>
  );
};

export default DocumentContent;
