
import { useState, useCallback } from 'react';
import { CircularLetter } from '@/types/circular-letter';
import { toast } from 'sonner';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { extractTextFromDocument, processCircularLetterWithAI } from '@/utils/aiUtils';
import { hasOpenAIKey } from '@/utils/openaiClient';

interface UseCircularLetterUploadProps {
  onLettersUploaded: (letters: CircularLetter[]) => void;
}

export function useCircularLetterUpload({ onLettersUploaded }: UseCircularLetterUploadProps) {
  const [letters, setLetters] = useState<CircularLetter[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const handleFileSelection = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    // Check if AI is enabled but no API key is set
    if (aiEnabled && !hasOpenAIKey()) {
      toast.error("Please set your OpenAI API key to use AI features");
      return;
    }
    
    setIsLoading(true);
    
    const newLetters: CircularLetter[] = Array.from(selectedFiles)
      .filter(file => file.type === 'application/pdf') // Only accept PDFs for circular letters
      .map(file => ({
        id: generateUniqueId(),
        file,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        fileSize: formatFileSize(file.size),
        fileType: extractFileType(file),
        referenceNumber: '',
        date: '',
        audience: '',
        title: '',
        details: '',
        author: '',
        content: '',
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
          
          // If AI is enabled, extract text and generate metadata
          if (aiEnabled) {
            try {
              const { 
                content, 
                referenceNumber, 
                date, 
                audience, 
                title, 
                details, 
                author 
              } = await processCircularLetterWithAI(letterObj.file);
              
              updatedLetter = {
                ...updatedLetter,
                content,
                referenceNumber: referenceNumber || '',
                date: date || '',
                audience: audience || '',
                title: title || '',
                details: details || '',
                author: author || '',
                aiProcessing: {
                  status: 'completed',
                  model: 'gpt-4o-mini'
                }
              };
              
              toast.success(`Circular Letter "${letterObj.name}" processed successfully`);
              
            } catch (error) {
              console.error("AI processing error:", error);
              updatedLetter = {
                ...updatedLetter,
                aiProcessing: {
                  status: 'error',
                  error: 'Failed to extract information from circular letter'
                }
              };
            }
          } else {
            // If AI is not enabled, just extract the text content
            try {
              const content = await extractTextFromDocument(letterObj.file);
              updatedLetter = {
                ...updatedLetter,
                content
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
            processingError: 'Failed to process file'
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
  }, [aiEnabled]);

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
    
    onLettersUploaded(letters);
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
    toggleAI
  };
}
