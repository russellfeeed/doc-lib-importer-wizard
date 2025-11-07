
import React from 'react';
import { DocumentFile } from '@/types/document';
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
