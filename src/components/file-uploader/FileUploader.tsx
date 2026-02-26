
import React from 'react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useStandardsFileUpload } from '@/hooks/useStandardsFileUpload';
import { DocumentFile } from '@/types/document';
import DropZone from './DropZone';
import FileList from './FileList';
import AiSettings from './AiSettings';
import WordPressStatus from './WordPressStatus';

interface FileUploaderProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
  isStandards?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded, isStandards = false }) => {
  const useUploadHook = isStandards ? useStandardsFileUpload : useFileUpload;
  
  const {
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
  } = useUploadHook({ onFilesUploaded });

  return (
    <div className="space-y-6">
      {isStandards && <WordPressStatus />}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-foreground">Upload Settings</h3>
        <AiSettings 
          aiEnabled={aiEnabled} 
          onToggleAi={toggleAI} 
          onApiKeyChange={handleApiKeyChange} 
        />
      </div>

      <DropZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onBrowseClick={handleBrowseClick}
      />

      <FileList 
        files={files} 
        onRemoveFile={handleRemoveFile} 
      />

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
