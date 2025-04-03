
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
  currentDocument: DocumentFile;
} {
  const [editedDocuments, setEditedDocuments] = useState<DocumentFile[]>(initialDocuments);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const currentDocument = editedDocuments[currentDocIndex];

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
