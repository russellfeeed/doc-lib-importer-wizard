
import { useState, useCallback } from 'react';
import { CircularLetter } from '@/types/circular-letter';
import { toast } from 'sonner';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { extractTextFromDocument, processCircularLetterWithAI, generatePdfThumbnail, generateDocumentCategory } from '@/utils/aiUtils';
import { hasOpenAIKey } from '@/utils/openaiClient';
import { refreshCircularLetterPromptConfig } from '@/utils/promptManager';
import { useCategories } from '@/context/CategoryContext';

interface UseCircularLetterUploadProps {
  onLettersUploaded: (letters: CircularLetter[]) => void;
}

export function useCircularLetterUpload({ onLettersUploaded }: UseCircularLetterUploadProps) {
  const [letters, setLetters] = useState<CircularLetter[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const { hierarchy } = useCategories();

  const MAX_FILES = 20;

  const handleFileSelection = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    // Check file limit
    const remainingSlots = MAX_FILES - letters.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum of ${MAX_FILES} files allowed. Remove some files first.`);
      return;
    }
    let filesToProcess = Array.from(selectedFiles);
    if (filesToProcess.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more file(s) allowed. ${filesToProcess.length - remainingSlots} file(s) were skipped.`);
      filesToProcess = filesToProcess.slice(0, remainingSlots);
    }
    
    // Force refresh the circular letter prompt config to ensure excerpt is included
    refreshCircularLetterPromptConfig();
    
    // Check if AI is enabled but no API key is set
    if (aiEnabled && !hasOpenAIKey()) {
      toast.error("Please set your OpenAI API key to use AI features");
      return;
    }
    
    setIsLoading(true);
    
    const newLetters: CircularLetter[] = filesToProcess
      .filter(file => file.type === 'application/pdf') // Only accept PDFs for circular letters
      .map(file => ({
        id: generateUniqueId(),
        file,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        fileSize: formatFileSize(file.size),
        fileType: extractFileType(file),
        referenceNumber: '',
        correspondenceRef: '',
        date: '',
        audience: '',
        title: '',
        details: '',
        excerpt: '',
        author: '',
        tags: '',
        categories: 'Circular Letters', // Default category path
        content: '',
        appendices: [],
        isProcessing: true,
        aiProcessing: {
          status: aiEnabled ? 'processing' : 'idle'
        }
      }));
    
    if (newLetters.length === 0) {
      toast.error("Please upload PDF files only for Circular Letters");
      setIsLoading(false);
      return;
    }
    
    setLetters(prevLetters => [...prevLetters, ...newLetters]);
    
    // Process each file
    const processedLetters = await Promise.all(
      newLetters.map(async (letterObj) => {
        try {
          let updatedLetter = { ...letterObj, isProcessing: false };
          
          // Generate thumbnail for the PDF
          try {
            const thumbnail = await generatePdfThumbnail(letterObj.file);
            updatedLetter = {
              ...updatedLetter,
              thumbnail
            };
          } catch (error) {
            console.error("Thumbnail generation error:", error);
            // Continue without thumbnail if it fails
          }
          
          // If AI is enabled, extract text and generate metadata
          if (aiEnabled) {
            try {
              const { 
                content, 
                referenceNumber, 
                correspondenceRef,
                date, 
                audience, 
                title, 
                details,
                excerpt, 
                author,
                tags,
                appendices
              } = await processCircularLetterWithAI(letterObj.file);
              
              updatedLetter = {
                ...updatedLetter,
                content,
                referenceNumber: referenceNumber || '',
                correspondenceRef: correspondenceRef || '',
                date: date || '',
                audience: audience || '',
                title: title || '',
                details: details || '',
                excerpt: excerpt || '',
                author: author || '',
                tags: tags || '',
                appendices: appendices || [],
                aiProcessing: {
                  status: 'completed',
                  model: 'gpt-4o-mini'
                }
              };
              
              // After extracting basic info, now detect the specific circular letter subcategory
              try {
                // First check if there's a "Circular Letters" root category
                const circularLettersCategory = hierarchy.categories.find(
                  category => category.name === "Circular Letters"
                );
                
                let categoryPath = 'Circular Letters';
                
                if (circularLettersCategory) {
                  // If there are subcategories, try to find the best match based on content
                  if (circularLettersCategory.children.length > 0) {
                    // Only pass the Circular Letters subcategories for classification
                    const subCategoryPath = await generateDocumentCategory(
                      content, 
                      letterObj.name,
                      circularLettersCategory.children
                    );
                    
                    if (subCategoryPath) {
                      categoryPath = `Circular Letters > ${subCategoryPath}`;
                    }
                  }
                } else {
                  // If no Circular Letters category exists, use the full hierarchy
                  // but still make sure it starts with "Circular Letters"
                  const suggestedCategory = await generateDocumentCategory(
                    content, 
                    letterObj.name,
                    hierarchy.categories
                  );
                  
                  if (suggestedCategory) {
                    categoryPath = `Circular Letters > ${suggestedCategory.split(' > ').pop()}`;
                  }
                }
                
                updatedLetter = {
                  ...updatedLetter,
                  categories: categoryPath
                };
                
                console.log(`Detected category for ${letterObj.name}: ${categoryPath}`);
              } catch (error) {
                console.error("Category detection error:", error);
                // If category detection fails, use the default "Circular Letters" category
                updatedLetter = {
                  ...updatedLetter,
                  categories: 'Circular Letters'
                };
              }
              
              toast.success(`Circular Letter "${letterObj.name}" processed successfully`);
              
            } catch (error) {
              console.error("AI processing error:", error);
              updatedLetter = {
                ...updatedLetter,
                aiProcessing: {
                  status: 'error',
                  error: 'Failed to extract information from circular letter'
                },
                categories: 'Circular Letters' // Ensure default category is set even on error
              };
            }
          } else {
            // If AI is not enabled, just extract the text content
            try {
              const content = await extractTextFromDocument(letterObj.file);
              updatedLetter = {
                ...updatedLetter,
                content,
                categories: 'Circular Letters' // Ensure default category is set
              };
            } catch (error) {
              console.error("Text extraction error:", error);
            }
          }
          
          return updatedLetter;
        } catch (error) {
          console.error("Error processing file:", error);
          return {
            ...letterObj,
            isProcessing: false,
            processingError: 'Failed to process file',
            categories: 'Circular Letters' // Ensure default category is set even on error
          };
        }
      })
    );
    
    setLetters(prevLetters => 
      prevLetters.map(l => 
        processedLetters.find(pl => pl.id === l.id) || l
      )
    );
    
    setIsLoading(false);
    toast.success(`${newLetters.length} circular letters added successfully`);
  }, [aiEnabled, hierarchy.categories]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelection(e.dataTransfer.files);
  }, [handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files);
  }, [handleFileSelection]);

  const handleBrowseClick = useCallback(() => {
    // This is handled in the DropZone component
  }, []);

  const handleRemoveLetter = useCallback((id: string) => {
    setLetters(prevLetters => prevLetters.filter(letter => letter.id !== id));
    toast.info("Circular letter removed");
  }, []);

  const handleContinue = useCallback(() => {
    if (letters.length === 0) {
      toast.error("Please upload at least one circular letter");
      return;
    }
    
    if (letters.some(letter => letter.isProcessing)) {
      toast.error("Please wait for all circular letters to finish processing");
      return;
    }
    
    // Ensure all letters have at least the default category
    const lettersWithCategories = letters.map(letter => {
      if (!letter.categories) {
        return {
          ...letter,
          categories: 'Circular Letters'
        };
      }
      return letter;
    });
    
    onLettersUploaded(lettersWithCategories);
  }, [letters, onLettersUploaded]);

  const toggleAI = useCallback(() => {
    const newAiEnabled = !aiEnabled;
    setAiEnabled(newAiEnabled);
    
    if (newAiEnabled && !hasOpenAIKey()) {
      toast.info("Please set your OpenAI API key to use AI features");
    } else {
      toast.info(newAiEnabled ? "AI extraction enabled" : "AI extraction disabled");
    }
  }, [aiEnabled]);

  const handleApiKeyChange = useCallback((hasKey: boolean) => {
    if (aiEnabled && !hasKey) {
      toast.info("AI extraction will be disabled without an API key");
    }
  }, [aiEnabled]);

  return {
    letters,
    isDragging,
    isLoading,
    aiEnabled,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleBrowseClick,
    handleRemoveLetter,
    handleContinue,
    toggleAI,
    handleApiKeyChange
  };
}
