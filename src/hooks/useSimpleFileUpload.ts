import { useState, useCallback } from 'react';
import { DocumentFile } from '@/types/document';
import { toast } from 'sonner';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { extractTextFromDocument, generatePdfThumbnail, generateDocumentSummary, generateDocumentCategoryWithContext, generateDocumentTagsWithContext, generateDocumentScheme } from '@/utils/aiUtils';
import { hasOpenAIKey } from '@/utils/openaiClient';

interface UseSimpleFileUploadProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
}

export function useSimpleFileUpload({ onFilesUploaded }: UseSimpleFileUploadProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true); // AI enabled by default for simple version

  const handleFileSelection = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
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
        status: 'idle'
      }
    }));
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    
    
    // Process each file (extract text and run AI processing if enabled)
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
          
          // Extract text content
          try {
            const content = await extractTextFromDocument(fileObj.file);
            updatedFile = {
              ...updatedFile,
              content
            };

            // Run AI processing if enabled and API key is available
            if (aiEnabled && hasOpenAIKey()) {
              try {
                // Update file state to show AI processing started
                updatedFile = {
                  ...updatedFile,
                  aiProcessing: { status: 'processing' }
                };

                // Update files state immediately to show processing status
                setFiles(prevFiles => 
                  prevFiles.map(f => 
                    f.id === fileObj.id ? { ...f, aiProcessing: { status: 'processing' } } : f
                  )
                );

                // Generate excerpt
                const excerpt = await generateDocumentSummary(content, fileObj.name);
                updatedFile = { ...updatedFile, excerpt };

                // Generate category
                try {
                  const category = await generateDocumentCategoryWithContext(content, fileObj.name);
                  updatedFile = { ...updatedFile, categories: category };
                } catch (error) {
                  console.warn('Category generation failed:', error);
                }

                // Generate tags
                try {
                  const tags = await generateDocumentTagsWithContext(content, fileObj.name, updatedFile.categories);
                  updatedFile = { ...updatedFile, tags };
                } catch (error) {
                  console.warn('Tag generation failed:', error);
                }

                // Generate scheme
                try {
                  const scheme = await generateDocumentScheme(content, fileObj.name);
                  updatedFile = { 
                    ...updatedFile, 
                    customTaxonomies: {
                      ...updatedFile.customTaxonomies,
                      'tax:nsi-scheme': scheme
                    }
                  };
                } catch (error) {
                  console.warn('Scheme generation failed:', error);
                }

                updatedFile = {
                  ...updatedFile,
                  aiProcessing: { status: 'completed' }
                };

              } catch (error) {
                console.error("AI processing error:", error);
                updatedFile = {
                  ...updatedFile,
                  aiProcessing: { 
                    status: 'error', 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                  }
                };
              }
            }
          } catch (error) {
            console.error("Text extraction error:", error);
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
    
    if (aiEnabled && hasOpenAIKey()) {
      toast.success(`${newFiles.length} files uploaded and processed with AI`);
    } else {
      toast.success(`${newFiles.length} files uploaded successfully`);
    }
  }, []);

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
      toast.info("AI features require an OpenAI API key");
    }
  };

  const toggleAI = useCallback(() => {
    const newAiEnabled = !aiEnabled;
    setAiEnabled(newAiEnabled);
    
    if (newAiEnabled && !hasOpenAIKey()) {
      toast.info("Please set your OpenAI API key to use AI features");
    } else {
      toast.info(newAiEnabled ? "AI features enabled" : "AI features disabled");
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