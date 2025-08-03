
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
  handleGenerateAllExcerpts: () => Promise<void>;
  handleGenerateAllCategories: () => Promise<void>;
  handleGenerateAllTags: () => Promise<void>;
  handleGenerateAllSchemes?: () => Promise<void>;
  handleToggleAllPublished: (published: boolean) => void;
}
