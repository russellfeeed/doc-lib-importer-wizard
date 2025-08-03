import { UseDocumentEditorProps, UseDocumentEditorReturn } from './document-editor/types';
import { useDocumentState } from './document-editor/useDocumentState';
import { useDocumentActions } from './document-editor/useDocumentActions';
import { useNavigation } from './document-editor/useNavigation';
import { useSimpleAiGeneration } from './useSimpleAiGeneration';

export function useSimpleDocumentEditor({
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
    handleGenerateScheme,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags,
    handleGenerateAllSchemes
  } = useSimpleAiGeneration({
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
    handleGenerateScheme,
    handleSaveAll,
    toggleEditAll,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags,
    handleGenerateAllSchemes,
    handleToggleAllPublished,
  };
}