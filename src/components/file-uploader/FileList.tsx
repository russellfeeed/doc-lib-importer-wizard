
import React from 'react';
import { DocumentFile } from '@/types/document';
import { FileText, AlertCircle, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileListProps {
  files: DocumentFile[];
  onRemoveFile: (id: string) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onRemoveFile }) => {
  if (files.length === 0) {
    return null;
  }

  return (
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
                onClick={() => onRemoveFile(file.id)}
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;
