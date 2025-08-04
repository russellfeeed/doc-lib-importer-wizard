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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Edit, Check, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import { DocumentFile } from '@/types/document';

interface DocumentsTableViewProps {
  documents: DocumentFile[];
  isGeneratingAI: boolean;
  onEditDocument: (index: number, field: keyof DocumentFile, value: string | boolean | Record<string, string>) => void;
  onGenerateAllExcerpts: () => void;
  onToggleView: () => void;
  onSave: () => void;
  onBack: () => void;
  onToggleAllPublished: (published: boolean) => void;
}

const DocumentsTableView: React.FC<DocumentsTableViewProps> = ({
  documents,
  isGeneratingAI,
  onEditDocument,
  onGenerateAllExcerpts,
  onToggleView,
  onSave,
  onBack,
  onToggleAllPublished
}) => {
  // Function to determine if a document needs attention
  const needsAttention = (doc: DocumentFile): { needs: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    
    // Check for AI processing errors
    if (doc.aiProcessing?.status === 'error') {
      reasons.push('AI processing failed');
    }
    
    // Check for missing excerpt/summary
    if (!doc.excerpt || doc.excerpt.trim() === '') {
      reasons.push('Missing excerpt');
    }
    
    // Check for uncategorized documents
    if (!doc.categories || doc.categories.trim() === '' || doc.categories.toLowerCase().includes('uncategorised')) {
      reasons.push('Needs categorization');
    }
    
    // Check for missing tags
    if (!doc.tags || doc.tags.trim() === '') {
      reasons.push('Missing tags');
    }
    
    // Check for content extraction failures
    if (!doc.content || doc.content.includes('Failed to extract content')) {
      reasons.push('Content extraction failed');
    }
    
    // Check for incomplete processing
    if (doc.isProcessing) {
      reasons.push('Still processing');
    }
    
    return { needs: reasons.length > 0, reasons };
  };

  // Calculate if all documents are published
  const allPublished = documents.every(doc => doc.published);
  const somePublished = documents.some(doc => doc.published);
  
  // Count documents that need attention
  const documentsNeedingAttention = documents.filter(doc => needsAttention(doc).needs).length;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">All Documents</h3>
          {documentsNeedingAttention > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {documentsNeedingAttention} need attention
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="publish-all" className="text-sm font-medium">
              {allPublished ? 'Unpublish All' : 'Publish All'}
            </Label>
            <Switch
              id="publish-all"
              checked={allPublished}
              onCheckedChange={(checked) => onToggleAllPublished(checked)}
            />
          </div>
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc, index) => {
              const attentionCheck = needsAttention(doc);
              return (
                <TableRow key={doc.id} className={attentionCheck.needs ? 'bg-destructive/5 border-destructive/20' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={doc.name}
                        onChange={(e) => onEditDocument(index, 'name', e.target.value)}
                        className="w-full"
                      />
                      {attentionCheck.needs && (
                        <div title={`Issues: ${attentionCheck.reasons.join(', ')}`}>
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={doc.categories}
                      onChange={(e) => onEditDocument(index, 'categories', e.target.value)}
                      className={`w-full ${doc.categories?.toLowerCase().includes('uncategorised') ? 'border-destructive bg-destructive/10' : ''}`}
                    />
                    {doc.categories?.toLowerCase().includes('uncategorised') && (
                      <div className="text-xs text-destructive mt-1">Categorization failed</div>
                    )}
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
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Create a preview of the document content
                        const previewContent = `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>${doc.name}</title>
                            <style>
                              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                              .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
                              .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                              .content { white-space: pre-wrap; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>${doc.name}</h1>
                            </div>
                            <div class="metadata">
                              <p><strong>Categories:</strong> ${doc.categories || 'N/A'}</p>
                              <p><strong>Tags:</strong> ${doc.tags || 'N/A'}</p>
                              <p><strong>Authors:</strong> ${doc.authors || 'N/A'}</p>
                              <p><strong>File Size:</strong> ${doc.fileSize}</p>
                              <p><strong>Published:</strong> ${doc.published ? 'Yes' : 'No'}</p>
                            </div>
                            <div class="content">
                              <h3>Excerpt:</h3>
                              <p>${doc.excerpt || 'No excerpt available'}</p>
                              
                              <h3>Content:</h3>
                              <p>${doc.content || 'No content available'}</p>
                            </div>
                          </body>
                          </html>
                        `;
                        
                        const blob = new Blob([previewContent], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        
                        // Clean up the object URL after a short delay
                        setTimeout(() => URL.revokeObjectURL(url), 100);
                      }}
                      disabled={!doc.content && !doc.excerpt}
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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