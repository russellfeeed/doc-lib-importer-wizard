
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Edit, Check, Zap } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentsTableViewProps {
  documents: DocumentFile[];
  isGeneratingAI: boolean;
  onEditDocument: (index: number, field: keyof DocumentFile, value: string | boolean) => void;
  onGenerateAllExcerpts: () => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
}

const DocumentsTableView: React.FC<DocumentsTableViewProps> = ({
  documents,
  isGeneratingAI,
  onEditDocument,
  onGenerateAllExcerpts,
  onToggleView,
  onSave,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">All Documents</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onGenerateAllExcerpts}
            disabled={isGeneratingAI}
          >
            {isGeneratingAI ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate All Excerpts
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleView}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Individual Documents
          </Button>
        </div>
      </div>
      
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Authors</TableHead>
              <TableHead>File Size</TableHead>
              <TableHead>Excerpt</TableHead>
              <TableHead>Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc, index) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Input 
                    value={doc.name}
                    onChange={(e) => onEditDocument(index, 'name', e.target.value)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={doc.categories}
                    onChange={(e) => onEditDocument(index, 'categories', e.target.value)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={doc.tags}
                    onChange={(e) => onEditDocument(index, 'tags', e.target.value)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input 
                    value={doc.authors}
                    onChange={(e) => onEditDocument(index, 'authors', e.target.value)}
                    className="w-full"
                  />
                </TableCell>
                <TableCell>{doc.fileSize}</TableCell>
                <TableCell className="relative">
                  <div className="w-32 truncate" title={doc.excerpt}>
                    {doc.excerpt || "No excerpt"}
                  </div>
                  {doc.aiProcessing?.status === 'completed' && (
                    <Zap className="absolute top-1 right-1 h-3 w-3 text-green-500" />
                  )}
                  {doc.aiProcessing?.status === 'processing' && (
                    <div className="absolute top-1 right-1 animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                  )}
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={doc.published}
                    onCheckedChange={(checked) => onEditDocument(index, 'published', checked)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onSave}>
          <Check className="mr-2 h-4 w-4" />
          Generate CSV
        </Button>
      </div>
    </div>
  );
};

export default DocumentsTableView;
