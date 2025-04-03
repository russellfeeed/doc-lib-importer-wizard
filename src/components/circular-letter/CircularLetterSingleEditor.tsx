
import React from 'react';
import { CircularLetter } from '@/types/circular-letter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ListFilter, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CircularLetterSingleEditorProps {
  currentLetter: CircularLetter;
  currentIndex: number;
  totalLetters: number;
  isGeneratingAI: boolean;
  onEdit: (field: keyof CircularLetter, value: string | boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
}

const CircularLetterSingleEditor: React.FC<CircularLetterSingleEditorProps> = ({
  currentLetter,
  currentIndex,
  totalLetters,
  isGeneratingAI,
  onEdit,
  onPrevious,
  onNext,
  onToggleView,
  onSave,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold">
            Edit Circular Letter {currentIndex + 1} of {totalLetters}
          </h3>
          {isGeneratingAI && (
            <div className="ml-4 flex items-center text-blue-500">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
              <span>AI Processing...</span>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleView}
          >
            <ListFilter className="h-4 w-4 mr-2" />
            Table View
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reference Number</label>
              <Input 
                value={currentLetter.referenceNumber}
                onChange={(e) => onEdit('referenceNumber', e.target.value)}
                placeholder="Enter reference number"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input 
                value={currentLetter.date}
                onChange={(e) => onEdit('date', e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input 
                value={currentLetter.title}
                onChange={(e) => onEdit('title', e.target.value)}
                placeholder="Enter circular letter title"
              />
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Audience</label>
              <Input 
                value={currentLetter.audience}
                onChange={(e) => onEdit('audience', e.target.value)}
                placeholder="Enter intended audience"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Author/Sender</label>
              <Input 
                value={currentLetter.author}
                onChange={(e) => onEdit('author', e.target.value)}
                placeholder="Enter author or sender"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Details</label>
          <Textarea 
            value={currentLetter.details}
            onChange={(e) => onEdit('details', e.target.value)}
            placeholder="Enter circular letter details"
            rows={5}
          />
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium mb-1">Document Content Preview</label>
          <div className="border rounded-md p-3 bg-gray-50 text-gray-700 h-32 overflow-y-auto text-sm">
            {currentLetter.content ? (
              <div className="whitespace-pre-wrap font-mono">{currentLetter.content.substring(0, 500)}...</div>
            ) : (
              <div className="text-gray-400 italic">No content extracted</div>
            )}
          </div>
        </div>
      </Card>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={onNext}
            disabled={currentIndex === totalLetters - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            onClick={onSave}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CircularLetterSingleEditor;
