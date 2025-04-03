
import { useState } from 'react';
import { DocumentFile } from '@/types/document';
import { DocumentEditorState, UseDocumentEditorProps } from './types';

export function useDocumentState({ 
  initialDocuments 
}: UseDocumentEditorProps): DocumentEditorState & {
  setEditedDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  setCurrentDocIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsEditingAll: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
  currentDocument: DocumentFile | undefined;
} {
  const [editedDocuments, setEditedDocuments] = useState<DocumentFile[]>(initialDocuments || []);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Make sure we have a valid document at the current index
  const currentDocument = editedDocuments.length > 0 ? editedDocuments[currentDocIndex] : undefined;

  return {
    editedDocuments,
    setEditedDocuments,
    currentDocIndex,
    setCurrentDocIndex,
    isEditingAll,
    setIsEditingAll,
    isGeneratingAI,
    setIsGeneratingAI,
    currentDocument
  };
}
