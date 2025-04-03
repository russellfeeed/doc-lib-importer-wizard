
import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, ChevronLeft, FileText, Edit, Check } from 'lucide-react';
import { DocumentFile } from '@/types/document';
import { toast } from 'sonner';

interface DocumentEditorProps {
  documents: DocumentFile[];
  onSave: (documents: DocumentFile[]) => void;
  onBack: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  documents, 
  onSave, 
  onBack 
}) => {
  const [editedDocuments, setEditedDocuments] = useState<DocumentFile[]>(documents);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [isEditingAll, setIsEditingAll] = useState(false);
  
  const currentDocument = editedDocuments[currentDocIndex];

  const handleChange = (field: keyof DocumentFile, value: string | boolean) => {
    setEditedDocuments(prev => prev.map((doc, index) =>
      index === currentDocIndex ? { ...doc, [field]: value } : doc
    ));
  };

  const handleNext = () => {
    if (currentDocIndex < editedDocuments.length - 1) {
      setCurrentDocIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(prev => prev - 1);
    }
  };

  const handleGenerateExcerpt = () => {
    // In a real implementation, this would call an AI API to summarize the document
    // For now, we'll just simulate it with a timeout
    toast.info("Generating excerpt...");
    
    setTimeout(() => {
      const newExcerpt = `This is an auto-generated summary for "${currentDocument.name}". In a real implementation, this would be generated using OpenAI or another AI service to analyze the document content.`;
      
      handleChange('excerpt', newExcerpt);
      toast.success("Excerpt generated successfully");
    }, 1500);
  };

  const handleSaveAll = () => {
    if (editedDocuments.some(doc => !doc.name)) {
      toast.error("All documents must have a name");
      return;
    }
    
    onSave(editedDocuments);
    toast.success("Document information saved");
  };

  const toggleEditAll = () => {
    setIsEditingAll(!isEditingAll);
  };

  return (
    <div className="space-y-6">
      {!isEditingAll ? (
        // Individual document editing view
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="mr-2" />
              Document {currentDocIndex + 1} of {editedDocuments.length}
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleEditAll}
            >
              <Edit className="mr-2 h-4 w-4" />
              View All Documents
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Document Name</label>
                <Input 
                  value={currentDocument.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter document name"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Categories</label>
                <Input 
                  value={currentDocument.categories}
                  onChange={(e) => handleChange('categories', e.target.value)}
                  placeholder="E.g., Policies > HR"
                  title="Use > to denote category hierarchy"
                />
                <p className="text-xs text-gray-500 mt-1">Use &gt; for category hierarchy (e.g., Policies &gt; HR)</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tags</label>
                <Input 
                  value={currentDocument.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="E.g., Important, Confidential"
                  title="Separate tags with commas"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Authors</label>
                <Input 
                  value={currentDocument.authors}
                  onChange={(e) => handleChange('authors', e.target.value)}
                  placeholder="E.g., John Smith, Jane Doe"
                  title="Separate authors with commas"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple authors with commas</p>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Excerpt / Summary</label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateExcerpt}
                  >
                    Generate
                  </Button>
                </div>
                <Textarea 
                  value={currentDocument.excerpt}
                  onChange={(e) => handleChange('excerpt', e.target.value)}
                  placeholder="Brief summary of the document"
                  rows={4}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">File URL</label>
                <Input 
                  value={currentDocument.fileUrl}
                  onChange={(e) => handleChange('fileUrl', e.target.value)}
                  placeholder="URL to the file (e.g., Dropbox link)"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Direct URL</label>
                <Input 
                  value={currentDocument.directUrl}
                  onChange={(e) => handleChange('directUrl', e.target.value)}
                  placeholder="Direct URL to view the document"
                />
              </div>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <Switch 
                    checked={currentDocument.published}
                    onCheckedChange={(checked) => handleChange('published', checked)}
                    id="published"
                  />
                  <label htmlFor="published" className="ml-2 text-sm font-medium">
                    Published
                  </label>
                </div>
              </div>
            </div>
          </div>
          
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
                onClick={handlePrevious}
                disabled={currentDocIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNext}
                disabled={currentDocIndex === editedDocuments.length - 1}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={handleSaveAll}
              >
                <Check className="mr-2 h-4 w-4" />
                Generate CSV
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Table view for editing all documents at once
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">All Documents</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleEditAll}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Individual Documents
            </Button>
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
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedDocuments.map((doc, index) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Input 
                        value={doc.name}
                        onChange={(e) => {
                          setEditedDocuments(prev => prev.map((d, i) =>
                            i === index ? { ...d, name: e.target.value } : d
                          ));
                        }}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={doc.categories}
                        onChange={(e) => {
                          setEditedDocuments(prev => prev.map((d, i) =>
                            i === index ? { ...d, categories: e.target.value } : d
                          ));
                        }}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={doc.tags}
                        onChange={(e) => {
                          setEditedDocuments(prev => prev.map((d, i) =>
                            i === index ? { ...d, tags: e.target.value } : d
                          ));
                        }}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={doc.authors}
                        onChange={(e) => {
                          setEditedDocuments(prev => prev.map((d, i) =>
                            i === index ? { ...d, authors: e.target.value } : d
                          ));
                        }}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>{doc.fileSize}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={doc.published}
                        onCheckedChange={(checked) => {
                          setEditedDocuments(prev => prev.map((d, i) =>
                            i === index ? { ...d, published: checked } : d
                          ));
                        }}
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
            <Button onClick={handleSaveAll}>
              <Check className="mr-2 h-4 w-4" />
              Generate CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
