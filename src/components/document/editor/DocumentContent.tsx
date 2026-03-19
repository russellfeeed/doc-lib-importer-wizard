
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { DocumentFile } from '@/types/document';

// Generate current year/month for WordPress upload URLs
const getCurrentUploadPath = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}/${month}`;
};

interface DocumentContentProps {
  document: DocumentFile;
  isGeneratingAI: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  onGenerateExcerpt: () => void;
  isStandards?: boolean;
}

const DocumentContent: React.FC<DocumentContentProps> = ({
  document,
  isGeneratingAI,
  onEdit,
  onGenerateExcerpt,
  isStandards = false
}) => {
  const getFileUrlPlaceholder = () => {
    const fileName = `${document.name}${document.name.includes('.') ? '' : '.pdf'}`;
    const urlFileName = isStandards ? fileName.replace(/[–—]/g, '-').replace(/\s+/g, '-') : fileName.replace(/[–—]/g, '-');
    
    if (isStandards) {
      return `/wp-content/uploads/_pda/${getCurrentUploadPath()}/${urlFileName}`;
    }
    return `https://dev.members.nsi.org.uk/wp-content/uploads/${getCurrentUploadPath()}/${urlFileName}`;
  };

  const getDirectUrlPlaceholder = () => {
    const fileName = `${document.name}${document.name.includes('.') ? '' : '.pdf'}`;
    const urlFileName = isStandards ? fileName.replace(/[–—]/g, '-').replace(/\s+/g, '-') : fileName.replace(/[–—]/g, '-');
    
    if (isStandards) {
      return `https://dev.members.nsi.org.uk/wp-content/uploads/_pda/${getCurrentUploadPath()}/${urlFileName}`;
    }
    return `https://dev.members.nsi.org.uk/wp-content/uploads/${getCurrentUploadPath()}/${urlFileName}`;
  };

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
          value={document.fileUrl || getFileUrlPlaceholder()}
          onChange={(e) => onEdit('fileUrl', e.target.value)}
          placeholder={getFileUrlPlaceholder()}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Direct URL</label>
        <Input 
          value={document.directUrl || getDirectUrlPlaceholder()}
          onChange={(e) => onEdit('directUrl', e.target.value)}
          placeholder={getDirectUrlPlaceholder()}
        />
      </div>
    </div>
  );
};

export default DocumentContent;
