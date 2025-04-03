
import React from 'react';
import { CircularLetter } from '@/types/circular-letter';
import { FileText, AlertCircle, Zap, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CircularLetterListProps {
  letters: CircularLetter[];
  onRemoveLetter: (id: string) => void;
}

const CircularLetterList: React.FC<CircularLetterListProps> = ({ letters, onRemoveLetter }) => {
  if (letters.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-700 mb-3">Uploaded Circular Letters ({letters.length})</h3>
      <div className="space-y-2">
        {letters.map(letter => (
          <div key={letter.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-blue-500" />
              <div>
                <p className="font-medium">{letter.file.name}</p>
                <p className="text-sm text-gray-500">{letter.fileSize}</p>
                {letter.referenceNumber && !letter.isProcessing && letter.aiProcessing?.status === 'completed' && (
                  <div className="text-xs">
                    <p className="text-green-600">
                      <span className="font-medium">Ref:</span> {letter.referenceNumber} 
                      {letter.correspondenceRef && (
                        <> | <span className="font-medium">Corr Ref:</span> {letter.correspondenceRef}</>
                      )}
                    </p>
                    {letter.tags && (
                      <p className="text-blue-600 flex items-center gap-1 mt-1">
                        <Tag className="h-3 w-3" />
                        {letter.tags}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {letter.isProcessing ? (
                <div className="flex items-center text-amber-500">
                  <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full mr-2" />
                  <span>Processing...</span>
                </div>
              ) : letter.processingError ? (
                <div className="flex items-center text-red-500">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Error</span>
                </div>
              ) : letter.aiProcessing?.status === 'processing' ? (
                <div className="flex items-center text-blue-500">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                  <span>AI Analyzing...</span>
                </div>
              ) : letter.aiProcessing?.status === 'error' ? (
                <div className="flex items-center text-red-500">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>AI Error</span>
                </div>
              ) : letter.aiProcessing?.status === 'completed' ? (
                <div className="flex items-center text-green-500">
                  <Zap className="h-4 w-4 mr-1" />
                  <span>AI Ready</span>
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveLetter(letter.id)}
                title="Remove circular letter"
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

export default CircularLetterList;
