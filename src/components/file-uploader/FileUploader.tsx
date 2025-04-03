
import React from 'react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { DocumentFile } from '@/types/document';
import DropZone from './DropZone';
import FileList from './FileList';
import AiSettings from './AiSettings';

interface FileUploaderProps {
  onFilesUploaded: (files: DocumentFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
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
  } = useFileUpload({ onFilesUploaded });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-700">Upload Settings</h3>
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
