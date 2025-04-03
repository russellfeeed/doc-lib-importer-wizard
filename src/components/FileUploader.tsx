import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentFile } from '@/types/document';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { toast } from 'sonner';
import { extractTextFromDocument, processDocumentWithAI } from '@/utils/aiUtils';
import ApiKeyManager from './ApiKeyManager';
import { hasOpenAIKey } from '@/utils/openaiClient';

interface FileUploaderProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-700">Upload Settings</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">AI Summarization</span>
          <Button 
            variant={aiEnabled ? "default" : "outline"} 
            size="sm"
            onClick={toggleAI}
            className={aiEnabled ? "bg-blue-600" : ""}
          >
            <Zap className={`h-4 w-4 mr-1 ${aiEnabled ? "text-white" : "text-gray-500"}`} />
            {aiEnabled ? "Enabled" : "Disabled"}
          </Button>
          <ApiKeyManager onKeyChange={handleApiKeyChange} />
        </div>
      </div>

      <div
        className={`file-drop-area border-2 border-dashed rounded-lg p-8 transition-all ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx"
        />
        
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-700">Drag & drop your files here</h3>
          <p className="mt-1 text-sm text-gray-500">Supports PDF, Word, Excel, PowerPoint and text files</p>
          <Button 
            variant="outline" 
            onClick={handleBrowseClick} 
            className="mt-4"
          >
            Browse Files
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Uploaded Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium">{file.file.name}</p>
                    <p className="text-sm text-gray-500">{file.fileSize} • {file.fileType}</p>
                    {file.categories && !file.isProcessing && file.aiProcessing?.status === 'completed' && (
                      <p className="text-xs text-green-600">
                        <span className="font-medium">Category:</span> {file.categories}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {file.isProcessing ? (
                    <div className="flex items-center text-amber-500">
                      <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full mr-2" />
                      <span>Processing...</span>
                    </div>
                  ) : file.processingError ? (
                    <div className="flex items-center text-red-500">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>Error</span>
                    </div>
                  ) : file.aiProcessing?.status === 'processing' ? (
                    <div className="flex items-center text-blue-500">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                      <span>AI Analyzing...</span>
                    </div>
                  ) : file.aiProcessing?.status === 'error' ? (
                    <div className="flex items-center text-red-500">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>AI Error</span>
                    </div>
                  ) : file.aiProcessing?.status === 'completed' ? (
                    <div className="flex items-center text-green-500">
                      <Zap className="h-4 w-4 mr-1" />
                      <span>AI Ready</span>
                    </div>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(file.id)}
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <Button 
          onClick={handleContinue} 
          disabled={files.length === 0 || isLoading || files.some(file => file.isProcessing)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
