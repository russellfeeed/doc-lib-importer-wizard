import { useState, useCallback } from 'react';
import { DocumentFile } from '@/types/document';
import { toast } from 'sonner';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { extractTextFromDocument, processStandardsDocumentWithAI, generatePdfThumbnail } from '@/utils/aiUtils';
import { hasOpenAIKey } from '@/utils/openaiClient';


interface UseStandardsFileUploadProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
}

export function useStandardsFileUpload({ onFilesUploaded }: UseStandardsFileUploadProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);

  const MAX_FILES = 20;

  const handleFileSelection = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    // Check file limit
    const remainingSlots = MAX_FILES - files.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum of ${MAX_FILES} files allowed. Remove some files first.`);
      return;
    }
    let filesToProcess = Array.from(selectedFiles);
    if (filesToProcess.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more file(s) allowed. ${filesToProcess.length - remainingSlots} file(s) were skipped.`);
      filesToProcess = filesToProcess.slice(0, remainingSlots);
    }
    
    // Check if AI is enabled but no API key is set
    if (aiEnabled && !hasOpenAIKey()) {
      toast.error("Please set your OpenAI API key to use AI features");
      return;
    }
    
    setIsLoading(true);
    
    const newFiles: DocumentFile[] = filesToProcess.map(file => ({
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
      published: true,
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
          
          // Generate thumbnail for PDF files
          if (fileObj.file.type === 'application/pdf') {
            try {
              const thumbnail = await generatePdfThumbnail(fileObj.file);
              updatedFile = {
                ...updatedFile,
                thumbnail
              };
            } catch (error) {
              console.error("Thumbnail generation error:", error);
              // Continue without thumbnail if it fails
            }
          }
          
          // If AI is enabled, extract text and generate a summary using standards-specific processing
          if (aiEnabled) {
            try {
              const { summary, content, category, tags, standardNumber, documentTitle } = await processStandardsDocumentWithAI(fileObj.file);
              
              updatedFile = {
                ...updatedFile,
                excerpt: summary,
                content: content,
                categories: category || '',
                tags: tags || '',
                standardNumber: standardNumber || '',
                documentTitle: documentTitle || '',
                aiProcessing: {
                  status: 'completed',
                  model: 'gpt-4o-mini' // Default model
                }
              };
              
              // WordPress duplicate check is now manual-only (via the WP Duplicate Check button)
              if (standardNumber) {
                toast.success(`Extracted standard: ${standardNumber}`);
              } else if (category) {
                toast.success(`Standards document "${fileObj.name}" categorized as "${category}"`);
              }
              
            } catch (error) {
              console.error("AI processing error:", error);
              
              // Even if AI processing fails, try to extract the content so it's available for manual editing
              try {
                const content = await extractTextFromDocument(fileObj.file);
                const errorMessage = error instanceof Error && error.message.includes('context length')
                  ? 'Document too large - processed first portion successfully'
                  : (error instanceof Error ? error.message : 'AI processing failed');
                
                updatedFile = {
                  ...updatedFile,
                  content: content,
                  aiProcessing: {
                    status: 'error',
                    error: errorMessage
                      ? 'Document too large for automatic AI processing - content preserved for manual editing'
                      : 'Failed to generate AI summary - content preserved for manual editing'
                  }
                };
              } catch (extractError) {
                console.error("Content extraction error:", extractError);
                updatedFile = {
                  ...updatedFile,
                  aiProcessing: {
                    status: 'error',
                    error: 'Failed to extract document content'
                  }
                };
              }
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
    toast.success(`${newFiles.length} standards files added successfully`);
  }, [aiEnabled, files.length]);

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