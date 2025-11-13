import { useCallback } from 'react';
import { DocumentFile } from '@/types/document';
import { generateDocumentSummary, generateStandardsCategory, generateDocumentTags } from '@/utils/aiUtils';
import { toast } from 'sonner';

interface UseStandardsAiGenerationProps {
  editedDocuments: DocumentFile[];
  currentDocIndex: number;
  setEditedDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useStandardsAiGeneration({
  editedDocuments,
  currentDocIndex,
  setEditedDocuments,
  setIsGeneratingAI
}: UseStandardsAiGenerationProps) {
  const handleGenerateExcerpt = useCallback(async () => {
    if (!editedDocuments[currentDocIndex]) return;
    
    const currentDoc = editedDocuments[currentDocIndex];
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      toast.error('Cannot generate excerpt: Document content is empty');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const excerpt = await generateDocumentSummary(currentDoc.content, currentDoc.name);
      
      setEditedDocuments(prev => 
        prev.map((doc, index) => 
          index === currentDocIndex 
            ? { ...doc, excerpt }
            : doc
        )
      );
      
      toast.success('Excerpt generated successfully');
    } catch (error) {
      console.error('Error generating excerpt:', error);
      toast.error('Failed to generate excerpt');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, currentDocIndex, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateCategory = useCallback(async () => {
    if (!editedDocuments[currentDocIndex]) return;
    
    const currentDoc = editedDocuments[currentDocIndex];
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      toast.error('Cannot generate category: Document content is empty');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const category = await generateStandardsCategory(currentDoc.content, currentDoc.name);
      
      setEditedDocuments(prev => 
        prev.map((doc, index) => 
          index === currentDocIndex 
            ? { ...doc, categories: category }
            : doc
        )
      );
      
      toast.success('Category generated successfully');
    } catch (error) {
      console.error('Error generating category:', error);
      toast.error('Failed to generate category');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, currentDocIndex, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateTags = useCallback(async () => {
    if (!editedDocuments[currentDocIndex]) return;
    
    const currentDoc = editedDocuments[currentDocIndex];
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      toast.error('Cannot generate tags: Document content is empty');
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const tags = await generateDocumentTags(currentDoc.content, currentDoc.name, currentDoc.categories);
      
      setEditedDocuments(prev => 
        prev.map((doc, index) => 
          index === currentDocIndex 
            ? { ...doc, tags }
            : doc
        )
      );
      
      toast.success('Tags generated successfully');
    } catch (error) {
      console.error('Error generating tags:', error);
      toast.error('Failed to generate tags');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, currentDocIndex, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateAllExcerpts = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (!updatedDocs[i].content || updatedDocs[i].content.trim().length === 0) {
            continue;
          }
          const excerpt = await generateDocumentSummary(updatedDocs[i].content, updatedDocs[i].name);
          updatedDocs[i] = { ...updatedDocs[i], excerpt };
        } catch (error) {
          console.error(`Error generating excerpt for document ${i}:`, error);
        }
      }
      
      setEditedDocuments(updatedDocs);
      toast.success('All excerpts generated successfully');
    } catch (error) {
      console.error('Error generating all excerpts:', error);
      toast.error('Failed to generate excerpts');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateAllCategories = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (!updatedDocs[i].content || updatedDocs[i].content.trim().length === 0) {
            continue;
          }
          const category = await generateStandardsCategory(updatedDocs[i].content, updatedDocs[i].name);
          updatedDocs[i] = { ...updatedDocs[i], categories: category };
        } catch (error) {
          console.error(`Error generating category for document ${i}:`, error);
        }
      }
      
      setEditedDocuments(updatedDocs);
      toast.success('All categories generated successfully');
    } catch (error) {
      console.error('Error generating all categories:', error);
      toast.error('Failed to generate categories');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateAllTags = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (!updatedDocs[i].content || updatedDocs[i].content.trim().length === 0) {
            continue;
          }
          const tags = await generateDocumentTags(updatedDocs[i].content, updatedDocs[i].name, updatedDocs[i].categories);
          updatedDocs[i] = { ...updatedDocs[i], tags };
        } catch (error) {
          console.error(`Error generating tags for document ${i}:`, error);
        }
      }
      
      setEditedDocuments(updatedDocs);
      toast.success('All tags generated successfully');
    } catch (error) {
      console.error('Error generating all tags:', error);
      toast.error('Failed to generate tags');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, setEditedDocuments, setIsGeneratingAI]);

  return {
    handleGenerateExcerpt,
    handleGenerateCategory,
    handleGenerateTags,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags
  };
}