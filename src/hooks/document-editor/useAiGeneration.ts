import { toast } from 'sonner';
import { DocumentFile } from '@/types/document';
import { generateDocumentSummary, generateDocumentCategory, generateDocumentTags } from '@/utils/aiUtils';
import { hasOpenAIKey } from '@/utils/openaiClient';

interface UseAiGenerationProps {
  editedDocuments: DocumentFile[];
  currentDocIndex: number;
  setEditedDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
  setIsGeneratingAI: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAiGeneration({
  editedDocuments,
  currentDocIndex,
  setEditedDocuments,
  setIsGeneratingAI
}: UseAiGenerationProps) {
  
  const handleGenerateExcerpt = async () => {
    const currentDocument = editedDocuments[currentDocIndex];
    if (!currentDocument) {
      toast.error("No document selected");
      return;
    }
    
    if (!hasOpenAIKey()) {
      toast.error("OpenAI API key is required. Please set it in the API Key Manager");
      return;
    }

    // Check if content is empty
    if (!currentDocument.content || currentDocument.content.trim().length === 0) {
      return;
    }
    
    setIsGeneratingAI(true);
    
    try {
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { status: 'processing' } 
        } : doc
      ));
      
      const summary = await generateDocumentSummary(
        currentDocument.content, 
        currentDocument.file?.name || currentDocument.name
      );
      
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          excerpt: summary,
          aiProcessing: { 
            status: 'completed',
            model: 'gpt-4o-mini' // Default model
          } 
        } : doc
      ));
      
      toast.success("AI excerpt generated successfully");
    } catch (error) {
      console.error("Error generating AI excerpt:", error);
      
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { 
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to generate AI summary'
          } 
        } : doc
      ));
      
      toast.error("Failed to generate AI excerpt");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateCategory = async () => {
    const currentDocument = editedDocuments[currentDocIndex];
    if (!currentDocument.file) {
      toast.error("Cannot determine category: No file attached");
      return;
    }
    
    // Check if content is empty
    if (!currentDocument.content || currentDocument.content.trim().length === 0) {
      return;
    }
    
    setIsGeneratingAI(true);
    
    try {
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { status: 'processing' } 
        } : doc
      ));
      
      const category = await generateDocumentCategory(
        currentDocument.content, 
        currentDocument.file.name
      );
      
      if (category) {
        setEditedDocuments(prev => prev.map((doc, index) =>
          index === currentDocIndex ? { 
            ...doc, 
            categories: category,
            aiProcessing: { 
              status: 'completed',
              model: 'gpt-4o-mini' // Default model
            } 
          } : doc
        ));
        
        toast.success(`Document categorized as: ${category}`);
      } else {
        toast.warning("AI couldn't determine a category for this document");
      }
    } catch (error) {
      console.error("Error generating AI category:", error);
      
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { 
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to determine category'
          } 
        } : doc
      ));
      
      toast.error("Failed to determine document category");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateTags = async () => {
    const currentDocument = editedDocuments[currentDocIndex];
    if (!currentDocument.file) {
      toast.error("Cannot generate tags: No file attached");
      return;
    }
    
    // Check if content is empty
    if (!currentDocument.content || currentDocument.content.trim().length === 0) {
      return;
    }
    
    setIsGeneratingAI(true);
    
    try {
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { status: 'processing' } 
        } : doc
      ));
      
      const tags = await generateDocumentTags(
        currentDocument.content, 
        currentDocument.file.name,
        currentDocument.categories
      );
      
      if (tags) {
        setEditedDocuments(prev => prev.map((doc, index) =>
          index === currentDocIndex ? { 
            ...doc, 
            tags: tags,
            aiProcessing: { 
              status: 'completed',
              model: 'gpt-4o-mini' // Default model
            } 
          } : doc
        ));
        
        toast.success(`Generated tags: ${tags}`);
      } else {
        toast.warning("AI couldn't generate tags for this document");
      }
    } catch (error) {
      console.error("Error generating AI tags:", error);
      
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { 
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to generate tags'
          } 
        } : doc
      ));
      
      toast.error("Failed to generate document tags");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateAllExcerpts = async (selectedIndices?: Set<number>) => {
    setIsGeneratingAI(true);
    
    const hasFilesToProcess = editedDocuments.some(doc => 
      doc.file && (!doc.excerpt || doc.excerpt.trim() === '')
    );
    
    if (!hasFilesToProcess) {
      toast.info("No documents need AI excerpt generation");
      setIsGeneratingAI(false);
      return;
    }
    
    toast.info("Generating excerpts for all documents...");
    
    const docsInProgress = [...editedDocuments];
    
    for (let i = 0; i < docsInProgress.length; i++) {
      const doc = docsInProgress[i];
      
      if (selectedIndices && !selectedIndices.has(i)) continue;
      if (!doc.file || (doc.excerpt && doc.excerpt.trim() !== '')) continue;
      
      try {
        if (!doc.content || doc.content.trim().length === 0) {
          continue;
        }

        docsInProgress[i] = {
          ...doc,
          aiProcessing: { status: 'processing' }
        };
        setEditedDocuments([...docsInProgress]);
        
        const summary = await generateDocumentSummary(
          doc.content,
          doc.file.name
        );
        
        docsInProgress[i] = {
          ...doc,
          excerpt: summary,
          aiProcessing: { 
            status: 'completed',
            model: 'gpt-4o-mini' // Default model
          }
        };
        setEditedDocuments([...docsInProgress]);
      } catch (error) {
        console.error(`Error generating excerpt for document ${i}:`, error);
        
        docsInProgress[i] = {
          ...doc,
          aiProcessing: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to generate AI summary'
          }
        };
        setEditedDocuments([...docsInProgress]);
      }
    }
    
    setIsGeneratingAI(false);
    toast.success("Finished generating AI excerpts");
  };

  const handleGenerateAllCategories = async (selectedIndices?: Set<number>) => {
    setIsGeneratingAI(true);
    
    const hasFilesToProcess = editedDocuments.some(doc => 
      doc.file && (!doc.categories || doc.categories.trim() === '')
    );
    
    if (!hasFilesToProcess) {
      toast.info("No documents need AI category detection");
      setIsGeneratingAI(false);
      return;
    }
    
    toast.info("Determining categories for all documents...");
    
    const docsInProgress = [...editedDocuments];
    
    for (let i = 0; i < docsInProgress.length; i++) {
      const doc = docsInProgress[i];
      
      if (selectedIndices && !selectedIndices.has(i)) continue;
      if (!doc.file || (doc.categories && doc.categories.trim() !== '')) continue;
      
      try {
        if (!doc.content || doc.content.trim().length === 0) {
          continue;
        }

        docsInProgress[i] = {
          ...doc,
          aiProcessing: { status: 'processing' }
        };
        setEditedDocuments([...docsInProgress]);
        
        const category = await generateDocumentCategory(
          doc.content,
          doc.file.name
        );
        
        if (category) {
          docsInProgress[i] = {
            ...doc,
            categories: category,
            aiProcessing: { 
              status: 'completed',
              model: 'gpt-4o-mini' // Default model
            }
          };
          setEditedDocuments([...docsInProgress]);
        }
      } catch (error) {
        console.error(`Error determining category for document ${i}:`, error);
        
        docsInProgress[i] = {
          ...doc,
          aiProcessing: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to determine category'
          }
        };
        setEditedDocuments([...docsInProgress]);
      }
    }
    
    setIsGeneratingAI(false);
    toast.success("Finished determining document categories");
  };

  const handleGenerateAllTags = async (selectedIndices?: Set<number>) => {
    setIsGeneratingAI(true);
    
    const hasFilesToProcess = editedDocuments.some(doc => 
      doc.file && (!doc.tags || doc.tags.trim() === '')
    );
    
    if (!hasFilesToProcess) {
      toast.info("No documents need AI tag generation");
      setIsGeneratingAI(false);
      return;
    }
    
    toast.info("Generating tags for all documents...");
    
    const docsInProgress = [...editedDocuments];
    
    for (let i = 0; i < docsInProgress.length; i++) {
      const doc = docsInProgress[i];
      
      if (selectedIndices && !selectedIndices.has(i)) continue;
      if (!doc.file || (doc.tags && doc.tags.trim() !== '')) continue;
      
      try {
        if (!doc.content || doc.content.trim().length === 0) {
          continue;
        }

        docsInProgress[i] = {
          ...doc,
          aiProcessing: { status: 'processing' }
        };
        setEditedDocuments([...docsInProgress]);
        
        const tags = await generateDocumentTags(
          doc.content,
          doc.file.name,
          doc.categories
        );
        
        if (tags) {
          docsInProgress[i] = {
            ...doc,
            tags: tags,
            aiProcessing: { 
              status: 'completed',
              model: 'gpt-4o-mini' // Default model
            }
          };
          setEditedDocuments([...docsInProgress]);
        }
      } catch (error) {
        console.error(`Error generating tags for document ${i}:`, error);
        
        docsInProgress[i] = {
          ...doc,
          aiProcessing: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to generate tags'
          }
        };
        setEditedDocuments([...docsInProgress]);
      }
    }
    
    setIsGeneratingAI(false);
    toast.success("Finished generating document tags");
  };

  return {
    handleGenerateExcerpt,
    handleGenerateCategory,
    handleGenerateTags,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
    handleGenerateAllTags
  };
}
