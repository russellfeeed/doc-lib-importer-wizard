
import { toast } from 'sonner';
import { DocumentFile } from '@/types/document';
import { generateDocumentSummary, generateDocumentCategory } from '@/utils/aiUtils';

interface UseDocumentActionsProps {
  editedDocuments: DocumentFile[];
  currentDocIndex: number;
  setEditedDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: (documents: DocumentFile[]) => void;
}

export function useDocumentActions({
  editedDocuments,
  currentDocIndex,
  setEditedDocuments,
  setIsGeneratingAI,
  onSave
}: UseDocumentActionsProps) {
  const handleChange = (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => {
    setEditedDocuments(prev => prev.map((doc, index) =>
      index === currentDocIndex ? { ...doc, [field]: value } : doc
    ));
  };

  const handleTableChange = (index: number, field: keyof DocumentFile, value: string | boolean | Record<string, string>) => {
    setEditedDocuments(prev => prev.map((doc, i) =>
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const handleSaveAll = () => {
    if (editedDocuments.some(doc => !doc.name)) {
      toast.error("All documents must have a name");
      return;
    }
    
    onSave(editedDocuments);
    toast.success("Document information saved");
  };

  const handleToggleAllPublished = (published: boolean) => {
    setEditedDocuments(prev => prev.map(doc => ({ ...doc, published })));
    toast.success(`All documents ${published ? 'published' : 'unpublished'}`);
  };

  const handleDeleteDocument = () => {
    if (editedDocuments.length <= 1) {
      toast.error("Cannot delete the last document");
      return;
    }
    
    setEditedDocuments(prev => prev.filter((_, index) => index !== currentDocIndex));
    toast.success("Document deleted");
  };

  return {
    handleChange,
    handleTableChange,
    handleSaveAll,
    handleToggleAllPublished,
    handleDeleteDocument
  };
}
