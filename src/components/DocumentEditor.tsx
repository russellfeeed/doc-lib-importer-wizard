
import React from 'react';
import { DocumentFile } from '@/types/document';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';
import SingleDocumentEditor from './document/SingleDocumentEditor';
import DocumentsTableView from './document/DocumentsTableView';

interface DocumentEditorProps {
  documents: DocumentFile[];
  onSave: (documents: DocumentFile[]) => void;
  onBack: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  documents, 
  onSave, 
  onBack 
}) => {
  const {
    editedDocuments,
    currentDocIndex,
    currentDocument,
    isEditingAll,
    isGeneratingAI,
    handleChange,
    handleTableChange,
    handleNext,
    handlePrevious,
    handleGenerateExcerpt,
    handleGenerateCategory,
    handleSaveAll,
    toggleEditAll,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
  } = useDocumentEditor(documents, onSave);

  return (
    <div className="space-y-6">
      {!isEditingAll ? (
        <SingleDocumentEditor
          currentDocument={currentDocument}
          currentDocIndex={currentDocIndex}
          totalDocuments={editedDocuments.length}
          isGeneratingAI={isGeneratingAI}
          onEdit={handleChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onGenerateExcerpt={handleGenerateExcerpt}
          onGenerateCategory={handleGenerateCategory}
          onGenerateAllExcerpts={handleGenerateAllExcerpts}
          onGenerateAllCategories={handleGenerateAllCategories}
          onToggleView={toggleEditAll}
          onSave={handleSaveAll}
          onBack={onBack}
        />
      ) : (
        <DocumentsTableView
          documents={editedDocuments}
          isGeneratingAI={isGeneratingAI}
          onEditDocument={handleTableChange}
          onGenerateAllExcerpts={handleGenerateAllExcerpts}
          onToggleView={toggleEditAll}
          onSave={handleSaveAll}
          onBack={onBack}
        />
      )}
    </div>
  );
};

export default DocumentEditor;
