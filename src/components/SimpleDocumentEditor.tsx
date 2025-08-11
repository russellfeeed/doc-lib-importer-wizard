import React from 'react';
import { DocumentFile } from '@/types/document';
import { useSimpleDocumentEditor } from '@/hooks/useSimpleDocumentEditor';
import SingleDocumentEditor from '@/components/document/SingleDocumentEditor';
import DocumentsTableView from '@/components/document/DocumentsTableView';

interface SimpleDocumentEditorProps {
  documents: DocumentFile[];
  onSave: (documents: DocumentFile[]) => void;
  onBack: () => void;
}

const SimpleDocumentEditor: React.FC<SimpleDocumentEditorProps> = ({ documents, onSave, onBack }) => {
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
    handleGenerateTags,
    handleGenerateScheme,
    handleSaveAll,
    toggleEditAll,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags,
    handleGenerateAllSchemes,
    handleToggleAllPublished,
    handleDeleteDocument,
  } = useSimpleDocumentEditor({
    initialDocuments: documents,
    onSave
  });

  if (editedDocuments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No documents to edit.</p>
        <button 
          onClick={onBack}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Go back to upload
        </button>
      </div>
    );
  }

  return (
    <div>
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
          onGenerateTags={handleGenerateTags}
          onGenerateScheme={handleGenerateScheme}
          onGenerateAllExcerpts={handleGenerateAllExcerpts}
          onGenerateAllCategories={handleGenerateAllCategories}
          onGenerateAllTags={handleGenerateAllTags}
          onGenerateAllSchemes={handleGenerateAllSchemes}
          onToggleView={toggleEditAll}
          onSave={handleSaveAll}
          onBack={onBack}
          onDelete={handleDeleteDocument}
        />
      ) : (
        <DocumentsTableView
          documents={editedDocuments}
          isGeneratingAI={isGeneratingAI}
          onEditDocument={handleTableChange}
          onGenerateAllExcerpts={handleGenerateAllExcerpts}
          onGenerateAllCategories={handleGenerateAllCategories}
          onGenerateAllSchemes={handleGenerateAllSchemes}
          onGenerateAllTags={handleGenerateAllTags}
          onToggleView={toggleEditAll}
          onSave={handleSaveAll}
          onBack={onBack}
          onToggleAllPublished={handleToggleAllPublished}
        />
      )}
    </div>
  );
};

export default SimpleDocumentEditor;