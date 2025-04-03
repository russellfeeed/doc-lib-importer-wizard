
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface DocumentFooterProps {
  currentDocIndex: number;
  totalDocuments: number;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  onBack: () => void;
}

const DocumentFooter: React.FC<DocumentFooterProps> = ({
  currentDocIndex,
  totalDocuments,
  onPrevious,
  onNext,
  onSave,
  onBack
}) => {
  return (
    <div className="flex justify-between mt-6">
      <div>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentDocIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentDocIndex === totalDocuments - 1}
        >
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        <Button onClick={onSave}>
          <Check className="mr-2 h-4 w-4" />
          Generate CSV
        </Button>
      </div>
    </div>
  );
};

export default DocumentFooter;
