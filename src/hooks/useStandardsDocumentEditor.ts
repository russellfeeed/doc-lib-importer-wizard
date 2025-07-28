import { UseDocumentEditorProps, UseDocumentEditorReturn } from './document-editor/types';
import { useDocumentState } from './document-editor/useDocumentState';
import { useDocumentActions } from './document-editor/useDocumentActions';
import { useNavigation } from './document-editor/useNavigation';
import { useStandardsAiGeneration } from './useStandardsAiGeneration';

export function useStandardsDocumentEditor({
  initialDocuments,
  onSave
}: UseDocumentEditorProps): UseDocumentEditorReturn {
  const {
    editedDocuments,
    setEditedDocuments,
    currentDocIndex,
    setCurrentDocIndex,
    isEditingAll,
    setIsEditingAll,
    isGeneratingAI,
    setIsGeneratingAI,
    currentDocument
  } = useDocumentState({ initialDocuments, onSave });

  const { handleChange, handleTableChange, handleSaveAll } = useDocumentActions({
    editedDocuments,
    currentDocIndex,
    setEditedDocuments,
    setIsGeneratingAI,
    onSave
  });

  const { handleNext, handlePrevious, toggleEditAll } = useNavigation({
    currentDocIndex,
    totalDocuments: editedDocuments.length,
    setCurrentDocIndex,
    setIsEditingAll
  });

  const {
    handleGenerateExcerpt,
    handleGenerateCategory,
    handleGenerateTags,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags
  } = useStandardsAiGeneration({
    editedDocuments,
    currentDocIndex,
    setEditedDocuments,
    setIsGeneratingAI
  });

  return {
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
  };
}