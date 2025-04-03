
import React, { useState } from 'react';
import { useCircularLetterUpload } from '@/hooks/useCircularLetterUpload';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileTextIcon, PlusCircleIcon, UploadIcon } from 'lucide-react';
import DropZone from '@/components/file-uploader/DropZone';
import { Card } from '@/components/ui/card';
import CircularLetterList from './CircularLetterList';

interface CircularLetterUploaderProps {
  onLettersUploaded: (letters: any[]) => void;
}

const CircularLetterUploader: React.FC<CircularLetterUploaderProps> = ({ onLettersUploaded }) => {
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
    toggleAI
  } = useCircularLetterUpload({ onLettersUploaded });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Upload Circular Letters</h3>
        <div className="flex items-center">
          <span className="mr-2 text-sm">AI Extraction</span>
          <Switch checked={aiEnabled} onCheckedChange={toggleAI} />
        </div>
      </div>

      <DropZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onBrowseClick={handleBrowseClick}
      >
        <div className="text-center">
          <p className="mb-4 text-sm text-gray-500">
            Drop PDF files here. Circular Letters will be analyzed to extract reference numbers, dates, audiences, titles, details, and authors.
          </p>
          <Button 
            variant="outline" 
            onClick={handleBrowseClick} 
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
          onClick={handleBrowseClick}
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
