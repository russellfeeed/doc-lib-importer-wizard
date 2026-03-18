
import { DocumentFile } from '@/types/document';

export interface DocumentEditorState {
  editedDocuments: DocumentFile[];
  currentDocIndex: number;
  isEditingAll: boolean;
  isGeneratingAI: boolean;
}

export interface UseDocumentEditorProps {
  initialDocuments: DocumentFile[];
  onSave: (documents: DocumentFile[]) => void;
}

export interface UseDocumentEditorReturn extends DocumentEditorState {
  currentDocument: DocumentFile;
  handleChange: (field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  handleTableChange: (index: number, field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handleGenerateExcerpt: () => Promise<void>;
  handleGenerateCategory: () => Promise<void>;
  handleGenerateTags: () => Promise<void>;
  handleGenerateScheme?: () => Promise<void>;
  handleSaveAll: () => void;
  toggleEditAll: () => void;
  handleGenerateAllExcerpts: (selectedIndices?: Set<number>) => Promise<void>;
  handleGenerateAllCategories: (selectedIndices?: Set<number>) => Promise<void>;
  handleGenerateAllTags: (selectedIndices?: Set<number>) => Promise<void>;
  handleGenerateAllSchemes?: (selectedIndices?: Set<number>) => Promise<void>;
  handleToggleAllPublished: (published: boolean) => void;
  handleDeleteDocument: () => void;
}
