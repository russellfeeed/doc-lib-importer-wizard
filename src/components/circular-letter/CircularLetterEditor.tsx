
import React from 'react';
import { CircularLetter } from '@/types/circular-letter';
import { useDocumentEditor } from '@/hooks/useDocumentEditor';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import CircularLetterSingleEditor from './CircularLetterSingleEditor';
import CircularLetterTableView from './CircularLetterTableView';

interface CircularLetterEditorProps {
  letters: CircularLetter[];
  onSave: (letters: CircularLetter[]) => void;
  onBack: () => void;
}

const CircularLetterEditor: React.FC<CircularLetterEditorProps> = ({ 
  letters, 
  onSave, 
  onBack 
}) => {
  // Create a type assertion to make TypeScript happy
  // This is a workaround since we're using the document editor hook with circular letters
  type CircularLetterWithAssertion = CircularLetter & Record<string, any>;

  // Reuse the document editor hook with our circular letters
  const {
    editedDocuments: editedLetters,
    currentDocIndex,
    currentDocument: currentLetter,
    isEditingAll,
    isGeneratingAI,
    handleChange,
    handleTableChange,
    handleNext,
    handlePrevious,
    handleSaveAll,
    toggleEditAll,
  } = useDocumentEditor({
    initialDocuments: letters as any, 
    onSave: (docs) => onSave(docs as any)
  });

  // Handle the case when there are no letters
  if (editedLetters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Circular Letters Available</h3>
        <p className="text-gray-500 mb-4">Please upload some circular letters to begin editing.</p>
        <Button onClick={onBack} variant="outline">
          Go Back to Upload
        </Button>
      </div>
    );
  }

  // Create a type-safe wrapper around the handleChange function
  const handleCircularLetterChange = (field: keyof CircularLetter, value: string | boolean) => {
    handleChange(field as any, value);
  };

  // Create a type-safe wrapper around the handleTableChange function
  const handleCircularLetterTableChange = (index: number, field: keyof CircularLetter, value: string | boolean) => {
    handleTableChange(index, field as any, value);
  };

  return (
    <div className="space-y-6">
      {!isEditingAll ? (
        <CircularLetterSingleEditor
          currentLetter={currentLetter as CircularLetterWithAssertion}
          currentIndex={currentDocIndex}
          totalLetters={editedLetters.length}
          isGeneratingAI={isGeneratingAI}
          onEdit={handleCircularLetterChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToggleView={toggleEditAll}
          onSave={handleSaveAll}
          onBack={onBack}
        />
      ) : (
        <CircularLetterTableView
          letters={editedLetters as CircularLetterWithAssertion[]}
          isGeneratingAI={isGeneratingAI}
          onEditLetter={handleCircularLetterTableChange}
          onToggleView={toggleEditAll}
          onSave={handleSaveAll}
          onBack={onBack}
        />
      )}
    </div>
  );
};

export default CircularLetterEditor;
