
import { useState, useCallback } from 'react';
import { DocumentFile } from '@/types/document';
import { toast } from 'sonner';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { extractTextFromDocument, processDocumentWithAI } from '@/utils/aiUtils';
import { hasOpenAIKey } from '@/utils/openaiClient';

interface UseFileUploadProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
}

export function useFileUpload({ onFilesUploaded }: UseFileUploadProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
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
    
    const newFiles: DocumentFile[] = Array.from(selectedFiles).map(file => ({
      id: generateUniqueId(),
      file,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
      fileSize: formatFileSize(file.size),
      fileType: extractFileType(file),
      excerpt: '',
      categories: '',
      tags: '',
      authors: '',
      fileUrl: '',
      directUrl: '',
      imageUrl: '',
      content: '',
      published: false,
      customFields: {},
      customTaxonomies: {},
      isProcessing: true,
      aiProcessing: {
        status: aiEnabled ? 'processing' : 'idle'
      }
    }));
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    
    // Process each file
    const processedFiles = await Promise.all(
      newFiles.map(async (fileObj) => {
        try {
          let updatedFile = { ...fileObj, isProcessing: false };
          
          // If AI is enabled, extract text and generate a summary
          if (aiEnabled) {
            try {
              const { summary, content, category } = await processDocumentWithAI(fileObj.file);
              
              updatedFile = {
                ...updatedFile,
                excerpt: summary,
                content: content,
                categories: category || '',
                aiProcessing: {
                  status: 'completed',
                  model: 'gpt-4o-mini' // Default model
                }
              };
              
              if (category) {
                toast.success(`Document "${fileObj.name}" categorized as "${category}"`);
              }
              
            } catch (error) {
              console.error("AI processing error:", error);
              updatedFile = {
                ...updatedFile,
                aiProcessing: {
                  status: 'error',
                  error: 'Failed to generate AI summary'
                }
              };
            }
          } else {
            // If AI is not enabled, just extract the text content
            try {
              const content = await extractTextFromDocument(fileObj.file);
              updatedFile = {
                ...updatedFile,
                content
              };
            } catch (error) {
              console.error("Text extraction error:", error);
            }
          }
          
          return updatedFile;
        } catch (error) {
          console.error("Error processing file:", error);
          return {
            ...fileObj,
            isProcessing: false,
            processingError: 'Failed to process file'
          };
        }
      })
    );
    
    setFiles(prevFiles => 
      prevFiles.map(f => 
        processedFiles.find(pf => pf.id === f.id) || f
      )
    );
    
    setIsLoading(false);
    toast.success(`${newFiles.length} files added successfully`);
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
    // This is now handled in the DropZone component
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
    toast.info("File removed");
  }, []);

  const handleContinue = useCallback(() => {
    if (files.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }
    
    if (files.some(file => file.isProcessing)) {
      toast.error("Please wait for all files to finish processing");
      return;
    }
    
    onFilesUploaded(files);
  }, [files, onFilesUploaded]);

  const handleApiKeyChange = (hasKey: boolean) => {
    if (!hasKey && aiEnabled) {
      toast.info("AI summarization requires an OpenAI API key");
    }
  };

  const toggleAI = useCallback(() => {
    const newAiEnabled = !aiEnabled;
    setAiEnabled(newAiEnabled);
    
    if (newAiEnabled && !hasOpenAIKey()) {
      toast.info("Please set your OpenAI API key to use AI features");
    } else {
      toast.info(newAiEnabled ? "AI summarization enabled" : "AI summarization disabled");
    }
  }, [aiEnabled]);

  return {
    files,
    isDragging,
    isLoading,
    aiEnabled,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleBrowseClick,
    handleRemoveFile,
    handleContinue,
    handleApiKeyChange,
    toggleAI
  };
}
