import React from 'react';
import { DocumentFile } from '@/types/document';
import { useStandardsDocumentEditor } from '@/hooks/useStandardsDocumentEditor';
import SingleDocumentEditor from './document/SingleDocumentEditor';
import DocumentsTableView from './document/DocumentsTableView';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface StandardsDocumentEditorProps {
  documents: DocumentFile[];
  onSave: (documents: DocumentFile[]) => void;
  onBack: () => void;
}

const StandardsDocumentEditor: React.FC<StandardsDocumentEditorProps> = ({ 
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
    handleGenerateTags,
    handleSaveAll,
    toggleEditAll,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags,
    handleToggleAllPublished,
    handleDeleteDocument,
  } = useStandardsDocumentEditor({
    initialDocuments: documents, 
    onSave
  });

  // Handle the case when there are no documents
  if (editedDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Standards Available</h3>
        <p className="text-gray-500 mb-4">Please upload some standards documents to begin editing.</p>
        <Button onClick={onBack} variant="outline">
          Go Back to Upload
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isEditingAll ? (
        <SingleDocumentEditor
          currentDocument={currentDocument!}
          currentDocIndex={currentDocIndex}
          totalDocuments={editedDocuments.length}
          isGeneratingAI={isGeneratingAI}
          onEdit={handleChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onGenerateExcerpt={handleGenerateExcerpt}
          onGenerateCategory={handleGenerateCategory}
          onGenerateTags={handleGenerateTags}
          onGenerateAllExcerpts={handleGenerateAllExcerpts}
          onGenerateAllCategories={handleGenerateAllCategories}
          onGenerateAllTags={handleGenerateAllTags}
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

export default StandardsDocumentEditor;