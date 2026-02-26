
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
        {files.map(file => {
          // Debug logging
          console.log('FileList - File data:', {
            name: file.file.name,
            categories: file.categories,
            scheme: file.customTaxonomies?.['tax:nsi-scheme'],
            tags: file.tags,
            aiProcessing: file.aiProcessing
          });
          
          return (
          <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3">
              {file.thumbnail ? (
                <div className="h-16 w-12 flex-shrink-0 rounded overflow-hidden border border-gray-200 shadow-sm">
                  <img 
                    src={file.thumbnail} 
                    alt={`Thumbnail for ${file.file.name}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      const imgElement = e.currentTarget as HTMLImageElement;
                      imgElement.style.display = 'none';
                      const nextElement = imgElement.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                  <div className="hidden h-full w-full items-center justify-center bg-gray-100">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              ) : (
                <div className="h-16 w-12 flex-shrink-0 rounded border border-gray-200 flex items-center justify-center bg-gray-100">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
              )}
              <div>
                <p className="font-medium">{file.file.name}</p>
                <p className="text-sm text-gray-500">{file.fileSize} • {file.fileType}</p>
                {/* Show AI-detected category and scheme */}
                {file.aiProcessing?.status === 'completed' && (
                  <div className="mt-1 space-y-1">
                    {file.categories && (
                      <p className="text-xs text-green-600">
                        <span className="font-medium">Category:</span> {file.categories}
                      </p>
                    )}
                    {file.customTaxonomies?.['tax:nsi-scheme'] && (
                      <p className="text-xs text-blue-600">
                        <span className="font-medium">Scheme:</span> {file.customTaxonomies['tax:nsi-scheme']}
                      </p>
                    )}
                    {file.tags && (
                      <p className="text-xs text-purple-600">
                        <span className="font-medium">Tags:</span> {file.tags}
                      </p>
                    )}
                    {file.wpExisting && (
                      <p className="text-xs text-amber-600">
                        <span className="font-medium">⚠️ WP Duplicate:</span> {file.wpExisting.title} (ID: {file.wpExisting.id})
                      </p>
                    )}
                  </div>
                )}
                {/* Show processing status for incomplete AI processing */}
                {file.aiProcessing?.status === 'processing' && (
                  <p className="text-xs text-blue-500 mt-1">
                    <span className="font-medium">AI Processing:</span> Analyzing document...
                  </p>
                )}
                {file.aiProcessing?.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1">
                    <span className="font-medium">AI Error:</span> {file.aiProcessing.error || 'Processing failed'}
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
          );
        })}
      </div>
    </div>
  );
};

export default FileList;
