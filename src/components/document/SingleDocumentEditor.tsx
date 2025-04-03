
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
  onEdit: (field: keyof DocumentFile, value: string | boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onGenerateExcerpt: () => void;
  onGenerateCategory?: () => void;
  onGenerateAllExcerpts: () => void;
  onGenerateAllCategories?: () => void;
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
  onGenerateCategory,
  onGenerateAllExcerpts,
  onGenerateAllCategories,
  onToggleView,
  onSave,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <DocumentHeader 
        currentDocIndex={currentDocIndex}
        totalDocuments={totalDocuments}
        isGeneratingAI={isGeneratingAI}
        onGenerateAllExcerpts={onGenerateAllExcerpts}
        onGenerateAllCategories={onGenerateAllCategories}
        onToggleView={onToggleView}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocumentMetadata 
          document={currentDocument}
          isGeneratingAI={isGeneratingAI}
          onEdit={onEdit}
          onGenerateCategory={onGenerateCategory}
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
