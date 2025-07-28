
import { UseDocumentEditorProps, UseDocumentEditorReturn } from './types';
import { useDocumentState } from './useDocumentState';
import { useDocumentActions } from './useDocumentActions';
import { useNavigation } from './useNavigation';
import { useAiGeneration } from './useAiGeneration';

export function useDocumentEditor({
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

  const { handleChange, handleTableChange, handleSaveAll, handleToggleAllPublished } = useDocumentActions({
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
  } = useAiGeneration({
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
    handleToggleAllPublished,
  };
}
