
import React from 'react';
import { Button } from '@/components/ui/button';
import { useCircularLetterUpload } from '@/hooks/useCircularLetterUpload';
import { CircularLetter } from '@/types/circular-letter';
import DropZone from '../file-uploader/DropZone';
import CircularLetterList from './CircularLetterList';
import AiSettings from '../file-uploader/AiSettings';

interface CircularLetterUploaderProps {
  onLettersUploaded: (letters: CircularLetter[]) => void;
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
        <h3 className="text-lg font-medium text-gray-700">Upload Settings</h3>
        <AiSettings 
          aiEnabled={aiEnabled} 
          onToggleAi={toggleAI} 
          onApiKeyChange={() => {}} 
        />
      </div>

      <DropZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onBrowseClick={handleBrowseClick}
        // Remove the acceptedFileTypes prop as it's not in DropZoneProps
        helperText="Drop PDF files here. Circular Letters will be analyzed to extract reference numbers, dates, audiences, titles, details, and authors."
      />

      <CircularLetterList 
        letters={letters} 
        onRemoveLetter={handleRemoveLetter} 
      />

      <div className="flex justify-end mt-6">
        <Button 
          onClick={handleContinue} 
          disabled={letters.length === 0 || isLoading || letters.some(letter => letter.isProcessing)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default CircularLetterUploader;
