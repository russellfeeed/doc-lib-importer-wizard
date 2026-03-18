import { useCallback } from 'react';
import { DocumentFile } from '@/types/document';
import { generateDocumentSummary, generateDocumentCategoryWithContext, generateDocumentTagsWithContext, generateDocumentScheme } from '@/utils/aiUtils';
import { toast } from 'sonner';
import { hasWordPressSettings, promptForWordPressSettings } from '@/utils/settingsUtils';

interface UseSimpleAiGenerationProps {
  editedDocuments: DocumentFile[];
  currentDocIndex: number;
  setEditedDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSimpleAiGeneration({
  editedDocuments,
  currentDocIndex,
  setEditedDocuments,
  setIsGeneratingAI
}: UseSimpleAiGenerationProps) {
  const handleGenerateExcerpt = useCallback(async () => {
    if (!editedDocuments[currentDocIndex]) return;
    
    const currentDoc = editedDocuments[currentDocIndex];
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
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
    console.log('handleGenerateCategory called, currentDocIndex:', currentDocIndex);
    console.log('editedDocuments:', editedDocuments);
    
    if (!editedDocuments[currentDocIndex]) {
      console.log('No document at current index');
      return;
    }
    
    const currentDoc = editedDocuments[currentDocIndex];
    console.log('Current document:', currentDoc);
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      console.log('Calling generateDocumentCategoryWithContext...');
      const category = await generateDocumentCategoryWithContext(currentDoc.content, currentDoc.name);
      console.log('Generated category:', category);
      
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
      toast.error(`Failed to generate category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, currentDocIndex, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateTags = useCallback(async () => {
    if (!editedDocuments[currentDocIndex]) return;
    
    const currentDoc = editedDocuments[currentDocIndex];
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const tags = await generateDocumentTagsWithContext(currentDoc.content, currentDoc.name, currentDoc.categories);
      
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

  const handleGenerateScheme = useCallback(async () => {
    console.log('handleGenerateScheme called, currentDocIndex:', currentDocIndex);
    console.log('editedDocuments:', editedDocuments);
    
    if (!editedDocuments[currentDocIndex]) {
      console.log('No document at current index for scheme generation');
      return;
    }
    
    const currentDoc = editedDocuments[currentDocIndex];
    console.log('Current document for scheme:', currentDoc);
    
    // Check if content is empty
    if (!currentDoc.content || currentDoc.content.trim().length === 0) {
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      console.log('Calling generateDocumentScheme...');
      const scheme = await generateDocumentScheme(currentDoc.content, currentDoc.name);
      console.log('Generated scheme:', scheme);
      
      setEditedDocuments(prev => 
        prev.map((doc, index) => 
          index === currentDocIndex 
            ? { 
                ...doc, 
                customTaxonomies: {
                  ...doc.customTaxonomies,
                  'tax:nsi-scheme': scheme
                }
              }
            : doc
        )
      );
      
      toast.success('Scheme generated successfully');
    } catch (error) {
      console.error('Error generating scheme:', error);
      toast.error(`Failed to generate scheme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, currentDocIndex, setEditedDocuments, setIsGeneratingAI]);

  const handleGenerateAllExcerpts = useCallback(async (selectedIndices?: Set<number>) => {
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (selectedIndices && !selectedIndices.has(i)) continue;
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

  const handleGenerateAllCategories = useCallback(async (selectedIndices?: Set<number>) => {
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (selectedIndices && !selectedIndices.has(i)) continue;
          if (!updatedDocs[i].content || updatedDocs[i].content.trim().length === 0) {
            continue;
          }
          const category = await generateDocumentCategoryWithContext(updatedDocs[i].content, updatedDocs[i].name);
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

  const handleGenerateAllTags = useCallback(async (selectedIndices?: Set<number>) => {
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (selectedIndices && !selectedIndices.has(i)) continue;
          if (!updatedDocs[i].content || updatedDocs[i].content.trim().length === 0) {
            continue;
          }
          const tags = await generateDocumentTagsWithContext(updatedDocs[i].content, updatedDocs[i].name, updatedDocs[i].categories);
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

  const handleGenerateAllSchemes = useCallback(async (selectedIndices?: Set<number>) => {
    // Check if WordPress settings are configured
    if (!hasWordPressSettings()) {
      toast.error(promptForWordPressSettings());
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const updatedDocs = [...editedDocuments];
      
      for (let i = 0; i < updatedDocs.length; i++) {
        try {
          if (selectedIndices && !selectedIndices.has(i)) continue;
          if (!updatedDocs[i].content || updatedDocs[i].content.trim().length === 0) {
            continue;
          }
          const scheme = await generateDocumentScheme(updatedDocs[i].content, updatedDocs[i].name);
          updatedDocs[i] = { 
            ...updatedDocs[i], 
            customTaxonomies: {
              ...updatedDocs[i].customTaxonomies,
              'tax:nsi-scheme': scheme
            }
          };
        } catch (error) {
          console.error(`Error generating scheme for document ${i}:`, error);
        }
      }
      
      setEditedDocuments(updatedDocs);
      toast.success('All schemes generated successfully');
    } catch (error) {
      console.error('Error generating all schemes:', error);
      toast.error('Failed to generate schemes');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [editedDocuments, setEditedDocuments, setIsGeneratingAI]);

  return {
    handleGenerateExcerpt,
    handleGenerateCategory,
    handleGenerateTags,
    handleGenerateScheme,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags,
    handleGenerateAllSchemes
  };
}