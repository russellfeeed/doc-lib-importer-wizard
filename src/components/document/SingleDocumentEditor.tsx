
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, ChevronLeft, FileText, Edit, Check, Zap } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface SingleDocumentEditorProps {
  currentDocument: DocumentFile;
  currentDocIndex: number;
  totalDocuments: number;
  isGeneratingAI: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onGenerateExcerpt: () => void;
  onGenerateAllExcerpts: () => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
}

const SingleDocumentEditor: React.FC<SingleDocumentEditorProps> = ({
  currentDocument,
  currentDocIndex,
  totalDocuments,
  isGeneratingAI,
  onEdit,
  onPrevious,
  onNext,
  onGenerateExcerpt,
  onGenerateAllExcerpts,
  onToggleView,
  onSave,
  onBack
}) => {
  return (
    <div className="space-y-6">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Document Name</label>
            <Input 
              value={currentDocument.name}
              onChange={(e) => onEdit('name', e.target.value)}
              placeholder="Enter document name"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Categories</label>
            <Input 
              value={currentDocument.categories}
              onChange={(e) => onEdit('categories', e.target.value)}
              placeholder="E.g., Policies > HR"
              title="Use > to denote category hierarchy"
            />
            <p className="text-xs text-gray-500 mt-1">Use &gt; for category hierarchy (e.g., Policies &gt; HR)</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tags</label>
            <Input 
              value={currentDocument.tags}
              onChange={(e) => onEdit('tags', e.target.value)}
              placeholder="E.g., Important, Confidential"
              title="Separate tags with commas"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Authors</label>
            <Input 
              value={currentDocument.authors}
              onChange={(e) => onEdit('authors', e.target.value)}
              placeholder="E.g., John Smith, Jane Doe"
              title="Separate authors with commas"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple authors with commas</p>
          </div>
        </div>
        
        <div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Excerpt / Summary</label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onGenerateExcerpt}
                disabled={isGeneratingAI}
                className={currentDocument.aiProcessing?.status === 'processing' ? "opacity-50" : ""}
              >
                {currentDocument.aiProcessing?.status === 'processing' ? (
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
              value={currentDocument.excerpt}
              onChange={(e) => onEdit('excerpt', e.target.value)}
              placeholder="Brief summary of the document"
              rows={4}
            />
            {currentDocument.aiProcessing?.status === 'completed' && (
              <p className="text-xs text-green-500 mt-1">
                <Zap className="inline h-3 w-3 mr-1" />
                AI-generated summary
              </p>
            )}
            {currentDocument.aiProcessing?.status === 'error' && (
              <p className="text-xs text-red-500 mt-1">
                Error generating AI summary
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">File URL</label>
            <Input 
              value={currentDocument.fileUrl}
              onChange={(e) => onEdit('fileUrl', e.target.value)}
              placeholder="URL to the file (e.g., Dropbox link)"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Direct URL</label>
            <Input 
              value={currentDocument.directUrl}
              onChange={(e) => onEdit('directUrl', e.target.value)}
              placeholder="Direct URL to view the document"
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <Switch 
                checked={currentDocument.published}
                onCheckedChange={(checked) => onEdit('published', checked)}
                id="published"
              />
              <label htmlFor="published" className="ml-2 text-sm font-medium">
                Published
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <div>
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={currentDocIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={onNext}
            disabled={currentDocIndex === totalDocuments - 1}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={onSave}>
            <Check className="mr-2 h-4 w-4" />
            Generate CSV
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SingleDocumentEditor;
