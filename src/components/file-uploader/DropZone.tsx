
import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
  children?: React.ReactNode;
}

const DropZone: React.FC<DropZoneProps> = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onBrowseClick,
  children
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    onBrowseClick();
  };

  return (
    <div
      className={`file-drop-area border-2 border-dashed rounded-lg p-8 transition-all ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx"
      />
      
      {children || (
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
      )}
    </div>
  );
};

export default DropZone;
