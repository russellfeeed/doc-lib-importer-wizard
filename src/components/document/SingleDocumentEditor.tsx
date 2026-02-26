
import React from 'react';
import { DocumentFile } from '@/types/document';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import DocumentHeader from './editor/DocumentHeader';
import DocumentMetadata from './editor/DocumentMetadata';
import DocumentContent from './editor/DocumentContent';
import DocumentFooter from './editor/DocumentFooter';

interface SingleDocumentEditorProps {
  currentDocument: DocumentFile;
  currentDocIndex: number;
  totalDocuments: number;
  isGeneratingAI: boolean;
  showSchemes?: boolean;
  isStandards?: boolean;
  onEdit: (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  onPrevious: () => void;
  onNext: () => void;
  onGenerateExcerpt: () => void;
  onGenerateCategory?: () => void;
  onGenerateTags?: () => void;
  onGenerateScheme?: () => void;
  onGenerateAllExcerpts: () => void;
  onGenerateAllCategories?: () => void;
  onGenerateAllTags?: () => void;
  onGenerateAllSchemes?: () => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

const SingleDocumentEditor: React.FC<SingleDocumentEditorProps> = ({
  currentDocument,
  currentDocIndex,
  totalDocuments,
  isGeneratingAI,
  showSchemes = true,
  isStandards = false,
  onEdit,
  onPrevious,
  onNext,
  onGenerateExcerpt,
  onGenerateCategory,
  onGenerateTags,
  onGenerateScheme,
  onGenerateAllExcerpts,
  onGenerateAllCategories,
  onGenerateAllTags,
  onGenerateAllSchemes,
  onToggleView,
  onSave,
  onBack,
  onDelete
}) => {
  return (
    <div className="space-y-6">
      {currentDocument.wpExisting && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            This standard already exists in WordPress as "{currentDocument.wpExisting.title}" (status: {currentDocument.wpExisting.status}).{' '}
            <a href={currentDocument.wpExisting.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline font-medium">
              View in WordPress <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      )}
      <DocumentHeader 
        currentDocIndex={currentDocIndex}
        totalDocuments={totalDocuments}
        isGeneratingAI={isGeneratingAI}
        onGenerateAllExcerpts={onGenerateAllExcerpts}
        onGenerateAllCategories={onGenerateAllCategories}
        onGenerateAllTags={onGenerateAllTags}
        onGenerateAllSchemes={onGenerateAllSchemes}
        onToggleView={onToggleView}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocumentMetadata 
          document={currentDocument}
          isGeneratingAI={isGeneratingAI}
          showSchemes={showSchemes}
          isStandards={isStandards}
          onEdit={onEdit}
          onGenerateCategory={onGenerateCategory}
          onGenerateTags={onGenerateTags}
          onGenerateScheme={onGenerateScheme}
          onDelete={onDelete}
        />
        
        <DocumentContent 
          document={currentDocument}
          isGeneratingAI={isGeneratingAI}
          onEdit={onEdit}
          onGenerateExcerpt={onGenerateExcerpt}
          isStandards={isStandards}
        />
      </div>
      
      <DocumentFooter 
        currentDocIndex={currentDocIndex}
        totalDocuments={totalDocuments}
        onPrevious={onPrevious}
        onNext={onNext}
        onSave={onSave}
        onBack={onBack}
      />
    </div>
  );
};

export default SingleDocumentEditor;
