
import { useState } from 'react';
import { DocumentFile } from '@/types/document';
import { toast } from 'sonner';
import { generateDocumentSummary, generateDocumentCategory } from '@/utils/aiUtils';

export function useDocumentEditor(initialDocuments: DocumentFile[], onSave: (documents: DocumentFile[]) => void) {
  const [editedDocuments, setEditedDocuments] = useState<DocumentFile[]>(initialDocuments);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const currentDocument = editedDocuments[currentDocIndex];

  const handleChange = (field: keyof DocumentFile, value: string | boolean) => {
    setEditedDocuments(prev => prev.map((doc, index) =>
      index === currentDocIndex ? { ...doc, [field]: value } : doc
    ));
  };

  const handleTableChange = (index: number, field: keyof DocumentFile, value: string | boolean) => {
    setEditedDocuments(prev => prev.map((doc, i) =>
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const handleNext = () => {
    if (currentDocIndex < editedDocuments.length - 1) {
      setCurrentDocIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(prev => prev - 1);
    }
  };

  const handleGenerateExcerpt = async () => {
    if (!currentDocument.file) {
      toast.error("Cannot generate excerpt: No file attached");
      return;
    }
    
    setIsGeneratingAI(true);
    
    try {
      // Update document to show processing state
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { status: 'processing' } 
        } : doc
      ));
      
      // Generate the summary using OpenAI
      const summary = await generateDocumentSummary(
        currentDocument.content || 'No content available', 
        currentDocument.file.name
      );
      
      // Update document with the new summary
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
      
      // Update document to show error state
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
    if (!currentDocument.file) {
      toast.error("Cannot determine category: No file attached");
      return;
    }
    
    setIsGeneratingAI(true);
    
    try {
      // Update document to show processing state
      setEditedDocuments(prev => prev.map((doc, index) =>
        index === currentDocIndex ? { 
          ...doc, 
          aiProcessing: { status: 'processing' } 
        } : doc
      ));
      
      // Generate the category using OpenAI
      const category = await generateDocumentCategory(
        currentDocument.content || 'No content available', 
        currentDocument.file.name
      );
      
      if (category) {
        // Update document with the new category
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
      
      // Update document to show error state
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

  const handleSaveAll = () => {
    if (editedDocuments.some(doc => !doc.name)) {
      toast.error("All documents must have a name");
      return;
    }
    
    onSave(editedDocuments);
    toast.success("Document information saved");
  };

  const toggleEditAll = () => {
    setIsEditingAll(!isEditingAll);
  };

  const handleGenerateAllExcerpts = async () => {
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
    
    // Create a copy of documents to update
    const docsInProgress = [...editedDocuments];
    
    // Process each document that needs an excerpt
    for (let i = 0; i < docsInProgress.length; i++) {
      const doc = docsInProgress[i];
      
      // Skip documents that already have excerpts
      if (!doc.file || (doc.excerpt && doc.excerpt.trim() !== '')) continue;
      
      try {
        // Update status to processing
        docsInProgress[i] = {
          ...doc,
          aiProcessing: { status: 'processing' }
        };
        setEditedDocuments([...docsInProgress]);
        
        // Generate summary using OpenAI
        const summary = await generateDocumentSummary(
          doc.content || 'No content available',
          doc.file.name
        );
        
        // Update with new summary
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
        
        // Update with error status
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

  const handleGenerateAllCategories = async () => {
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
    
    // Create a copy of documents to update
    const docsInProgress = [...editedDocuments];
    
    // Process each document that needs a category
    for (let i = 0; i < docsInProgress.length; i++) {
      const doc = docsInProgress[i];
      
      // Skip documents that already have categories
      if (!doc.file || (doc.categories && doc.categories.trim() !== '')) continue;
      
      try {
        // Update status to processing
        docsInProgress[i] = {
          ...doc,
          aiProcessing: { status: 'processing' }
        };
        setEditedDocuments([...docsInProgress]);
        
        // Generate category using OpenAI
        const category = await generateDocumentCategory(
          doc.content || 'No content available',
          doc.file.name
        );
        
        // Update with new category
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
        
        // Update with error status
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
    handleSaveAll,
    toggleEditAll,
    handleGenerateAllExcerpts,
    handleGenerateAllCategories,
  };
}
