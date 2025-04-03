
import React from 'react';
import { CircularLetter } from '@/types/circular-letter';
import { Button } from '@/components/ui/button';
import { Save, FilePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CircularLetterTableViewProps {
  letters: CircularLetter[];
  isGeneratingAI: boolean;
  onEditLetter: (index: number, field: keyof CircularLetter, value: string | boolean) => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
}

const CircularLetterTableView: React.FC<CircularLetterTableViewProps> = ({
  letters,
  isGeneratingAI,
  onEditLetter,
  onToggleView,
  onSave,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold">Edit All Circular Letters</h3>
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
            <FilePlus className="h-4 w-4 mr-2" />
            Single View
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left border">File Name</th>
              <th className="px-4 py-2 text-left border">Reference</th>
              <th className="px-4 py-2 text-left border">Date</th>
              <th className="px-4 py-2 text-left border">Title</th>
              <th className="px-4 py-2 text-left border">Audience</th>
              <th className="px-4 py-2 text-left border">Author</th>
            </tr>
          </thead>
          <tbody>
            {letters.map((letter, index) => (
              <tr key={letter.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 border">{letter.name}</td>
                <td className="px-4 py-2 border">
                  <Input 
                    value={letter.referenceNumber}
                    onChange={(e) => onEditLetter(index, 'referenceNumber', e.target.value)}
                    className="h-8 min-h-8"
                  />
                </td>
                <td className="px-4 py-2 border">
                  <Input 
                    value={letter.date}
                    onChange={(e) => onEditLetter(index, 'date', e.target.value)}
                    className="h-8 min-h-8"
                  />
                </td>
                <td className="px-4 py-2 border">
                  <Input 
                    value={letter.title}
                    onChange={(e) => onEditLetter(index, 'title', e.target.value)}
                    className="h-8 min-h-8"
                  />
                </td>
                <td className="px-4 py-2 border">
                  <Input 
                    value={letter.audience}
                    onChange={(e) => onEditLetter(index, 'audience', e.target.value)}
                    className="h-8 min-h-8"
                  />
                </td>
                <td className="px-4 py-2 border">
                  <Input 
                    value={letter.author}
                    onChange={(e) => onEditLetter(index, 'author', e.target.value)}
                    className="h-8 min-h-8"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        
        <Button
          onClick={onSave}
        >
          <Save className="h-4 w-4 mr-1" />
          Save All
        </Button>
      </div>
    </div>
  );
};

export default CircularLetterTableView;
