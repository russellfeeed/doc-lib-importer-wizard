
import React, { useState } from 'react';
import { useCircularLetterUpload } from '@/hooks/useCircularLetterUpload';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileTextIcon, PlusCircleIcon, UploadIcon } from 'lucide-react';
import DropZone from '@/components/file-uploader/DropZone';
import { Card } from '@/components/ui/card';

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
        <p className="mb-2 text-sm text-gray-500">
          Drop PDF files here. Circular Letters will be analyzed to extract reference numbers, dates, audiences, titles, details, and authors.
        </p>
      </DropZone>

      {/* Letter List */}
      {letters.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Uploaded Circular Letters ({letters.length})</h4>
          <div className="grid grid-cols-1 gap-4">
            {letters.map((letter) => (
              <Card key={letter.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-3 p-2 bg-blue-50 rounded-full">
                    <FileTextIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">{letter.name}</p>
                    <p className="text-sm text-gray-500">{letter.fileSize} • {letter.fileType}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {letter.isProcessing ? (
                    <div className="text-sm text-blue-500 flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                      Processing...
                    </div>
                  ) : letter.processingError ? (
                    <div className="text-sm text-red-500">{letter.processingError}</div>
                  ) : letter.aiProcessing?.status === 'error' ? (
                    <div className="text-sm text-red-500">{letter.aiProcessing.error}</div>
                  ) : letter.aiProcessing?.status === 'completed' ? (
                    <div className="text-sm text-green-500">Processed</div>
                  ) : (
                    <div className="text-sm text-gray-500">Ready</div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-gray-500 hover:text-red-500"
                    onClick={() => handleRemoveLetter(letter.id)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

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
