
import React from 'react';
import { CircularLetter, AppendixItem } from '@/types/circular-letter';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ListFilter, Save, Tag, File, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  const handleAppendixChange = (index: number, field: keyof AppendixItem, value: string) => {
    if (!currentLetter.appendices) return;
    
    const updatedAppendices = [...currentLetter.appendices];
    updatedAppendices[index] = {
      ...updatedAppendices[index],
      [field]: value
    };
    
    onEdit('appendices' as keyof CircularLetter, updatedAppendices as any);
  };

  const addAppendix = () => {
    const newAppendix: AppendixItem = {
      title: `Appendix ${(currentLetter.appendices?.length || 0) + 1}`,
      content: ''
    };
    
    const updatedAppendices = currentLetter.appendices ? 
      [...currentLetter.appendices, newAppendix] : 
      [newAppendix];
    
    onEdit('appendices' as keyof CircularLetter, updatedAppendices as any);
  };

  const removeAppendix = (index: number) => {
    if (!currentLetter.appendices) return;
    
    const updatedAppendices = [...currentLetter.appendices];
    updatedAppendices.splice(index, 1);
    
    onEdit('appendices' as keyof CircularLetter, updatedAppendices as any);
  };

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
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 flex items-center">
            <File className="h-4 w-4 mr-1 text-gray-500" />
            Filename
          </label>
          <div className="text-sm text-gray-700 border p-2 rounded bg-gray-50">
            {currentLetter.file.name}
          </div>
        </div>

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
              <label className="block text-sm font-medium mb-1">Correspondence Reference</label>
              <Input 
                value={currentLetter.correspondenceRef}
                onChange={(e) => onEdit('correspondenceRef', e.target.value)}
                placeholder="Enter correspondence reference"
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
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                Tags
              </label>
              <Input 
                value={currentLetter.tags}
                onChange={(e) => onEdit('tags', e.target.value)}
                placeholder="Enter 1-5 comma-separated tags"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Details (Full Document Content)</label>
          <Textarea 
            value={currentLetter.details}
            onChange={(e) => onEdit('details', e.target.value)}
            placeholder="Enter circular letter details"
            rows={10}
          />
        </div>
        
        {/* Appendices Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Appendices</label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addAppendix}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Appendix
            </Button>
          </div>
          
          {currentLetter.appendices && currentLetter.appendices.length > 0 ? (
            <Accordion type="multiple" className="border rounded-md overflow-hidden">
              {currentLetter.appendices.map((appendix, index) => (
                <AccordionItem key={index} value={`appendix-${index}`}>
                  <div className="flex items-center">
                    <AccordionTrigger className="flex-1 px-4">
                      {appendix.title || `Appendix ${index + 1}`}
                    </AccordionTrigger>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="mr-2 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAppendix(index);
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <Input 
                          value={appendix.title}
                          onChange={(e) => handleAppendixChange(index, 'title', e.target.value)}
                          placeholder="Enter appendix title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Content</label>
                        <Textarea 
                          value={appendix.content}
                          onChange={(e) => handleAppendixChange(index, 'content', e.target.value)}
                          placeholder="Enter appendix content"
                          rows={5}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-sm text-gray-500 italic border rounded-md p-4">
              No appendices found. Add an appendix using the button above.
            </div>
          )}
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
