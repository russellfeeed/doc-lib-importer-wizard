
import React, { useState, useRef } from 'react';
import { useCircularLetterUpload } from '@/hooks/useCircularLetterUpload';
import { Button } from '@/components/ui/button';
import { FileTextIcon, PlusCircleIcon, UploadIcon } from 'lucide-react';
import DropZone from '@/components/file-uploader/DropZone';
import { Card } from '@/components/ui/card';
import CircularLetterList from './CircularLetterList';
import AiSettings from '@/components/file-uploader/AiSettings';

interface CircularLetterUploaderProps {
  onLettersUploaded: (letters: any[]) => void;
}

const CircularLetterUploader: React.FC<CircularLetterUploaderProps> = ({ onLettersUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
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
  } = useCircularLetterUpload({ onLettersUploaded });

  // Function to trigger the file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Upload Circular Letters</h3>
        <AiSettings
          aiEnabled={aiEnabled}
          onToggleAi={toggleAI}
          onApiKeyChange={handleApiKeyChange}
        />
      </div>

      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
      />

      <DropZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onBrowseClick={triggerFileInput}
      >
        <div className="text-center">
          <p className="mb-4 text-sm text-gray-500">
            Drop PDF files here. Circular Letters will be analyzed to extract reference numbers, dates, audiences, titles, details, and authors.
          </p>
          <Button 
            variant="outline" 
            onClick={triggerFileInput} 
            className="mt-2"
          >
            Browse Files
          </Button>
        </div>
      </DropZone>

      {/* Use the dedicated CircularLetterList component */}
      <CircularLetterList 
        letters={letters} 
        onRemoveLetter={handleRemoveLetter} 
      />

      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={triggerFileInput}
          disabled={isLoading}
        >
          <PlusCircleIcon className="h-4 w-4 mr-2" />
          Add More
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={letters.length === 0 || isLoading}
        >
          <UploadIcon className="h-4 w-4 mr-2" />
          Continue
        </Button>
      </div>
    </div>
  );
};

export default CircularLetterUploader;
