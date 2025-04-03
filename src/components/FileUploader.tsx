
import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentFile } from '@/types/document';
import { generateUniqueId, formatFileSize, extractFileType } from '@/utils/fileUtils';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      isProcessing: true
    }));
    
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    
    // Simulate document processing (in a real implementation, we would extract content, summarize with AI, etc.)
    setTimeout(() => {
      const processedFiles = newFiles.map(file => ({
        ...file,
        isProcessing: false,
        excerpt: `Auto-generated excerpt for ${file.name}`,
      }));
      
      setFiles(prevFiles => 
        prevFiles.map(f => 
          newFiles.find(nf => nf.id === f.id) 
            ? processedFiles.find(pf => pf.id === f.id) || f 
            : f
        )
      );
      
      setIsLoading(false);
      toast.success(`${newFiles.length} files added successfully`);
    }, 1500);
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

  return (
    <div className="space-y-6">
      <div
        className={`file-drop-area ${isDragging ? 'active' : ''}`}
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
